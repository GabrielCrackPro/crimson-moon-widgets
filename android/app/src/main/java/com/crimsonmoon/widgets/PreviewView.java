package com.crimsonmoon.widgets;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;
import android.view.View;

/**
 * Draws one preset from its catalog entry, in the same absolute layout Kustom
 * reads: positions are fractions of the board, sizes are dp scaled to the view.
 *
 * Drawing rather than shipping thumbnails means the preview uses the device's
 * own fonts, so 月の光 renders as the design intends instead of as tofu.
 */
public final class PreviewView extends View {

    private final Catalog.Widget widget;
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final TextPaint textPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rect = new RectF();

    public PreviewView(Context context, Catalog.Widget widget, float cornersDp) {
        super(context);
        this.widget = widget;
        this.cornersDp = cornersDp;
        textPaint.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
    }

    private final float cornersDp;

    @Override
    protected void onMeasure(int widthSpec, int heightSpec) {
        int width = MeasureSpec.getSize(widthSpec);
        int height = Math.round(width * (widget.rows / (float) widget.cols));
        setMeasuredDimension(width, height);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        float w = getWidth();
        float h = getHeight();
        if (w <= 0 || h <= 0) return;
        float scale = w / (widget.cols * 100f);

        for (Catalog.Item item : widget.items) draw(canvas, item, w, h, scale);
    }

    private void draw(Canvas canvas, Catalog.Item item, float w, float h, float scale) {
        float left = item.x * w;
        float top = item.y * h;

        switch (item.kind) {
            case "card": {
                paint.setShader(null);
                paint.setColor(item.color);
                rect.set(0, 0, w, h);
                canvas.drawRoundRect(rect, cornersDp * scale, cornersDp * scale, paint);
                return;
            }
            case "rule": {
                paint.setShader(null);
                paint.setColor(item.color);
                rect.set(left, top, left + item.w * w, top + item.h * scale);
                canvas.drawRect(rect, paint);
                return;
            }
            case "vrule": {
                paint.setShader(null);
                paint.setColor(item.color);
                rect.set(left, top, left + item.w * scale, top + item.h * h);
                canvas.drawRect(rect, paint);
                return;
            }
            case "circle": {
                paint.setShader(null);
                paint.setColor(item.color);
                float diameter = item.w * w;
                canvas.drawCircle(left + diameter / 2f, top + diameter / 2f, diameter / 2f, paint);
                return;
            }
            case "bar": {
                float height = item.h * scale;
                rect.set(left, top, left + item.w * w, top + height);
                paint.setShader(null);
                paint.setColor(item.track);
                canvas.drawRoundRect(rect, height / 2f, height / 2f, paint);
                float fraction = Math.max(0f, Math.min(100f, item.level)) / 100f;
                rect.set(left, top, left + item.w * w * fraction, top + height);
                paint.setColor(item.color);
                canvas.drawRoundRect(rect, height / 2f, height / 2f, paint);
                return;
            }
            case "art": {
                rect.set(left, top, left + item.w * w, top + item.h * h);
                paint.setShader(new LinearGradient(
                        rect.left, rect.top, rect.right, rect.bottom,
                        0xB3FF7E9D, 0xB3A30A26, Shader.TileMode.CLAMP));
                canvas.drawRoundRect(rect, 6 * scale, 6 * scale, paint);
                paint.setShader(null);
                paint.setStyle(Paint.Style.STROKE);
                paint.setStrokeWidth(Math.max(1f, scale));
                paint.setColor(0x40FF3F6B);
                canvas.drawRoundRect(rect, 6 * scale, 6 * scale, paint);
                paint.setStyle(Paint.Style.FILL);
                return;
            }
            case "text": {
                drawText(canvas, item, left, top, item.w * w, scale);
                return;
            }
            default:
        }
    }

    private void drawText(Canvas canvas, Catalog.Item item, float left, float top, float width, float scale) {
        float size = item.size * scale;
        if (size < 1f || TextUtils.isEmpty(item.text)) return;

        textPaint.setTextSize(size);
        textPaint.setColor(item.color);
        textPaint.setTypeface(Typeface.create(size >= 16f ? "sans-serif-light" : "sans-serif", Typeface.NORMAL));

        Layout.Alignment alignment = "CENTER".equals(item.align)
                ? Layout.Alignment.ALIGN_CENTER
                : Layout.Alignment.ALIGN_NORMAL;

        StaticLayout layout = StaticLayout.Builder
                .obtain(item.text, 0, item.text.length(), textPaint, Math.max(1, Math.round(width)))
                .setAlignment(alignment)
                .setIncludePad(false)
                .setLineSpacing(0f, 1.05f)
                .setMaxLines(item.lines)
                .setEllipsize(TextUtils.TruncateAt.END)
                .build();

        canvas.save();
        canvas.translate(left, top);
        layout.draw(canvas);
        canvas.restore();
    }
}
