package com.crimsonmoon.widgets;

import android.content.Context;
import android.content.res.AssetManager;
import android.graphics.Color;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Everything the app knows about the pack, read from assets/catalog.json.
 *
 * The catalog is generated from the same specs that produce the .kwgt files, so
 * a preview cannot drift from the preset it represents.
 */
public final class Catalog {

    public static final class Item {
        public String kind;
        public String text;
        public String align = "LEFT";
        public float x, y, w, h, size;
        public int color = Color.WHITE;
        public int track = 0x33F6E7EC;
        public float level;
        public int lines = 1;
        public boolean circle;
    }

    public static final class Widget {
        public String id;
        public String title;
        public String description;
        public String file;
        public int cols = 4;
        public int rows = 2;
        public final List<Item> items = new ArrayList<>();
    }

    public static final class Wallpaper {
        public String id;
        public String title;
        public String description;
        public String file;
    }

    public final List<Widget> widgets = new ArrayList<>();
    public final List<Wallpaper> wallpapers = new ArrayList<>();
    public float cornersDp = 28f;

    public static Catalog load(Context context) throws Exception {
        AssetManager assets = context.getAssets();
        JSONObject root = new JSONObject(read(assets, "catalog.json"));

        Catalog catalog = new Catalog();
        catalog.cornersDp = (float) root.optDouble("corners", 28);

        JSONArray widgets = root.optJSONArray("widgets");
        for (int i = 0; widgets != null && i < widgets.length(); i++) {
            JSONObject raw = widgets.getJSONObject(i);
            Widget widget = new Widget();
            widget.id = raw.getString("id");
            widget.title = raw.getString("title");
            widget.description = raw.optString("description", "");
            widget.file = raw.getString("file");
            JSONArray grid = raw.optJSONArray("grid");
            if (grid != null && grid.length() == 2) {
                widget.cols = grid.getInt(0);
                widget.rows = grid.getInt(1);
            }

            JSONArray items = raw.optJSONArray("items");
            for (int j = 0; items != null && j < items.length(); j++) {
                JSONObject entry = items.getJSONObject(j);
                Item item = new Item();
                item.kind = entry.getString("kind");
                item.text = entry.optString("text", "");
                item.align = entry.optString("align", "LEFT");
                item.x = (float) entry.optDouble("x", 0);
                item.y = (float) entry.optDouble("y", 0);
                item.w = (float) entry.optDouble("w", 0);
                item.h = (float) entry.optDouble("h", 0);
                item.size = (float) entry.optDouble("size", 0);
                item.color = color(entry.optString("color", null), Color.WHITE);
                item.track = color(entry.optString("track", null), 0x33F6E7EC);
                item.level = (float) entry.optDouble("level", 0);
                item.lines = Math.max(1, entry.optInt("lines", 1));
                item.circle = entry.optBoolean("circle", false);
                widget.items.add(item);
            }
            catalog.widgets.add(widget);
        }

        JSONArray wallpapers = root.optJSONArray("wallpapers");
        for (int i = 0; wallpapers != null && i < wallpapers.length(); i++) {
            JSONObject raw = wallpapers.getJSONObject(i);
            Wallpaper wallpaper = new Wallpaper();
            wallpaper.id = raw.getString("id");
            wallpaper.title = raw.getString("title");
            wallpaper.description = raw.optString("description", "");
            wallpaper.file = raw.getString("file");
            catalog.wallpapers.add(wallpaper);
        }

        return catalog;
    }

    private static int color(String value, int fallback) {
        if (value == null || value.isEmpty()) return fallback;
        try {
            return Color.parseColor(value);
        } catch (IllegalArgumentException ignored) {
            return fallback;
        }
    }

    private static String read(AssetManager assets, String name) throws IOException {
        try (InputStream in = assets.open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toString("UTF-8");
        }
    }
}
