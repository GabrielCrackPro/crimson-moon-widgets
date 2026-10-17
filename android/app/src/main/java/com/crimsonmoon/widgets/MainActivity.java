package com.crimsonmoon.widgets;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.WallpaperManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.InputStream;
import java.util.List;

/**
 * The pack's front door. Ten presets, six backdrops, and the documented
 * handoff into KWGT's widget picker.
 *
 * Nothing here needs KWGT to draw: the previews come from the catalog and the
 * wallpapers from assets. Only tapping a preset needs the editor.
 */
public final class MainActivity extends Activity {

    private static final String KWGT_PACKAGE = "org.kustom.widget";
    private static final String KWGT_PICKER = "org.kustom.widget.picker.WidgetPicker";

    private Catalog catalog;
    private int ink;
    private int moon;
    private int sakura;
    private int textColor;
    private int dim;
    private float density;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        density = getResources().getDisplayMetrics().density;
        ink = getColor(R.color.ink);
        moon = getColor(R.color.moon);
        sakura = getColor(R.color.sakura);
        textColor = getColor(R.color.text);
        dim = getColor(R.color.dim);

        try {
            catalog = Catalog.load(this);
        } catch (Exception error) {
            setContentView(message("The pack could not be read: " + error.getMessage()));
            return;
        }

        setContentView(build());
    }

    // ------------------------------------------------------------------ screen

    private View build() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(ink);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(22), dp(34), dp(22), dp(44));

        TextView kicker = label("CRIMSON MOON", 11, moon, 0.30f);
        root.addView(kicker, margins(0, 0, 0, dp(10)));

        TextView title = text("Widgets", 40, textColor);
        title.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        title.setLetterSpacing(-0.02f);
        root.addView(title, margins(0, 0, 0, dp(12)));

        TextView lede = text("Ten presets and six backdrops for KWGT, drawn from one palette.", 13, dim);
        lede.setLineSpacing(dp(4), 0.9f);
        root.addView(lede, margins(0, 0, 0, dp(16)));

        TextView how = label("HOW TO APPLY  →", 10, sakura, 0.18f);
        how.setPadding(0, dp(6), 0, dp(6));
        how.setOnClickListener(v -> showHowTo());
        root.addView(how, margins(0, 0, 0, dp(8)));

        root.addView(section("PRESETS"));
        root.addView(grid(), margins(0, 0, 0, dp(10)));

        root.addView(section("WALLPAPERS"));
        root.addView(wallpapers());

        TextView footer = text("Tap a preset to open it in KWGT. Sideload builds only: nothing here talks to a store.",
                11, dim);
        footer.setLineSpacing(dp(3), 1f);
        root.addView(footer, margins(0, dp(26), 0, 0));

        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return scroll;
    }

    private View grid() {
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        List<Catalog.Widget> widgets = catalog.widgets;

        for (int i = 0; i < widgets.size(); i += 2) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            View left = card(widgets.get(i));
            row.addView(left, weighted(1));
            if (i + 1 < widgets.size()) {
                View gap = new View(this);
                row.addView(gap, new LinearLayout.LayoutParams(dp(13), 1));
                row.addView(card(widgets.get(i + 1)), weighted(1));
            } else {
                View filler = new View(this);
                LinearLayout.LayoutParams params = weighted(1);
                params.leftMargin = dp(13);
                row.addView(filler, params);
            }
            column.addView(row, margins(0, 0, 0, dp(13)));
        }
        return column;
    }

    private View card(Catalog.Widget widget) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(9), dp(9), dp(9), dp(11));

        GradientDrawable background = new GradientDrawable();
        background.setColor(0x14FF2F5D);
        background.setCornerRadius(dp(19));
        background.setStroke(Math.max(1, Math.round(density)), 0x2EFF3F6B);
        card.setBackground(background);

        PreviewView preview = new PreviewView(this, widget, catalog.cornersDp);
        card.addView(preview, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView name = text(widget.title, 13, textColor);
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        card.addView(name, margins(0, dp(9), 0, dp(3)));

        TextView meta = text(widget.cols + "×" + widget.rows + "  ·  " + widget.items.size() + " layers",
                10, dim);
        card.addView(meta);

        card.setOnClickListener(v -> openPreset(widget));
        return card;
    }

    private View wallpapers() {
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.setClipToPadding(false);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);

        for (Catalog.Wallpaper wallpaper : catalog.wallpapers) {
            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);

            ImageView image = new ImageView(this);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            image.setImageBitmap(assetBitmap("wallpapers/" + wallpaper.file, 260));
            GradientDrawable frame = new GradientDrawable();
            frame.setCornerRadius(dp(14));
            frame.setStroke(Math.max(1, Math.round(density)), 0x33FF3F6B);
            frame.setColor(ink);
            image.setBackground(frame);
            image.setClipToOutline(true);
            image.setOutlineProvider(new android.view.ViewOutlineProvider() {
                @Override
                public void getOutline(View view, android.graphics.Outline outline) {
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), dp(14));
                }
            });
            item.addView(image, new LinearLayout.LayoutParams(dp(104), dp(231)));

            TextView name = text(wallpaper.title, 10, dim);
            name.setGravity(Gravity.CENTER_HORIZONTAL);
            item.addView(name, margins(0, dp(7), 0, 0));

            item.setOnClickListener(v -> showWallpaper(wallpaper));
            row.addView(item, margins(0, 0, dp(12), 0));
        }

        scroll.addView(row);
        return scroll;
    }

    // ----------------------------------------------------------------- actions

    private void openPreset(Catalog.Widget widget) {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(KWGT_PACKAGE, KWGT_PICKER));
        intent.setData(Uri.parse("kfile://" + getPackageName() + "/widgets/" + widget.file));

        if (intent.resolveActivity(getPackageManager()) == null) {
            showMissingKwgt();
            return;
        }
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            showMissingKwgt();
        }
    }

    private void showMissingKwgt() {
        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setTitle("KWGT is required")
                .setMessage("This pack hands its presets to Kustom Widget (KWGT). Install it, add a KWGT widget "
                        + "to the home screen, then tap a preset here.")
                .setPositiveButton("Open Play Store", (dialog, which) -> openStore())
                .setNegativeButton("Close", null)
                .show();
    }

    private void openStore() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("market://details?id=" + KWGT_PACKAGE)));
        } catch (ActivityNotFoundException ignored) {
            startActivity(new Intent(Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=" + KWGT_PACKAGE)));
        }
    }

    private void showHowTo() {
        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setTitle("Applying a preset")
                .setMessage("1. Long-press an empty spot on the home screen and add a KWGT widget.\n\n"
                        + "2. Resize it to the grid noted under each preset.\n\n"
                        + "3. Tap it, choose the installed Crimson Moon pack, and pick the preset.\n\n"
                        + "Tapping a preset in this app opens the same picker at that preset, which is the "
                        + "shorter route. KWGT Pro is required by KWGT itself for some of its features.")
                .setPositiveButton("Got it", null)
                .show();
    }

    private void showWallpaper(Catalog.Wallpaper wallpaper) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(20), dp(12), dp(20), 0);

        ImageView image = new ImageView(this);
        image.setAdjustViewBounds(true);
        image.setScaleType(ImageView.ScaleType.FIT_CENTER);
        image.setImageBitmap(assetBitmap("wallpapers/" + wallpaper.file, 540));
        box.addView(image, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView description = text(wallpaper.description, 12, dim);
        description.setLineSpacing(dp(3), 1f);
        box.addView(description, margins(0, dp(12), 0, 0));

        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                .setTitle(wallpaper.title)
                .setView(box)
                .setPositiveButton("Set wallpaper", (dialog, which) -> applyWallpaper(wallpaper))
                .setNegativeButton("Close", null)
                .show();
    }

    private void applyWallpaper(Catalog.Wallpaper wallpaper) {
        try (InputStream in = getAssets().open("wallpapers/" + wallpaper.file)) {
            WallpaperManager.getInstance(this).setStream(in);
            Toast.makeText(this, "Wallpaper set", Toast.LENGTH_SHORT).show();
        } catch (Exception error) {
            Toast.makeText(this, "Could not set the wallpaper", Toast.LENGTH_SHORT).show();
        }
    }

    // ------------------------------------------------------------------ pieces

    private TextView section(String text) {
        TextView view = label(text, 10, dim, 0.22f);
        return view;
    }

    private TextView label(String text, float sizeSp, int color, float spacing) {
        TextView view = text(text, sizeSp, color);
        view.setLetterSpacing(spacing);
        return view;
    }

    private TextView text(String value, float sizeSp, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(color);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp);
        view.setIncludeFontPadding(true);
        return view;
    }

    private View message(String value) {
        TextView view = text(value, 14, textColor);
        view.setPadding(dp(24), dp(48), dp(24), dp(24));
        view.setBackgroundColor(ink);
        return view;
    }

    private Bitmap assetBitmap(String path, int requiredWidth) {
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream in = getAssets().open(path)) {
                BitmapFactory.decodeStream(in, null, bounds);
            }
            int sample = 1;
            while (bounds.outWidth / (sample * 2) >= requiredWidth) sample *= 2;

            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = sample;
            try (InputStream in = getAssets().open(path)) {
                return BitmapFactory.decodeStream(in, null, options);
            }
        } catch (Exception error) {
            return null;
        }
    }

    private int dp(float value) {
        return Math.round(value * density);
    }

    private LinearLayout.LayoutParams margins(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return params;
    }

    private LinearLayout.LayoutParams weighted(int weight) {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, weight);
    }
}
