import { deflateRawSync } from "node:zlib";

// A .kwgt is just a zip with preset.json at its root, so the pack needs a zip
// writer and nothing else. There is no `zip` binary on this machine, and a
// dependency for eighty lines of spec is a poor trade.
//
// Deterministic on purpose: fixed DOS timestamp, fixed order, so a rebuild of
// unchanged sources produces byte-identical presets and `check` can diff them.

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// 1980-01-01 00:00, the earliest a zip can express. Nothing reads it, and it
// keeps two builds of the same input identical.
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

/**
 * Zip a list of `{ name, data }` entries.
 * @param {{name: string, data: Buffer|string}[]} entries
 * @returns {Buffer}
 */
export function zip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const deflated = deflateRawSync(raw, { level: 9 });
    // Store when compression does not pay off, which the tiny preset.json
    // sometimes decides for small widgets.
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);          // extra length
    name.copy(local, 30);

    const record = Buffer.alloc(46 + name.length);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);         // version made by
    record.writeUInt16LE(20, 6);         // version needed
    record.writeUInt16LE(0, 8);          // flags
    record.writeUInt16LE(method, 10);
    record.writeUInt16LE(DOS_TIME, 12);
    record.writeUInt16LE(DOS_DATE, 14);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(body.length, 20);
    record.writeUInt32LE(raw.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt16LE(0, 30);         // extra length
    record.writeUInt16LE(0, 32);         // comment length
    record.writeUInt16LE(0, 34);         // disk
    record.writeUInt16LE(0, 36);         // internal attrs
    record.writeUInt32LE(0, 38);         // external attrs
    record.writeUInt32LE(offset, 42);
    name.copy(record, 46);

    locals.push(local, body);
    central.push(record);
    offset += local.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

/** Read back the entry names of a zip, for verifying what we just wrote. */
export function zipEntryNames(buf) {
  const names = [];
  let i = 0;
  while (i + 4 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const size = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    names.push(buf.subarray(i + 30, i + 30 + nameLen).toString("utf8"));
    i += 30 + nameLen + extraLen + size;
  }
  return names;
}
