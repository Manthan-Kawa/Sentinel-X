from PIL import Image

img = Image.open(r"c:\Sentinel-X1.0-main\Sentinel-X1.0-main\src\WhatsApp Image 2026-08-25 at 11.10.34 PM.jpeg").convert("RGBA")
width, height = img.size

pixels = img.load()
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # Check if background pixel (checkerboard light gray/white)
        # Checkerboard background pixels have r > 175, g > 175, b > 175 and low color saturation
        if r > 175 and g > 175 and b > 175 and abs(r - g) < 25 and abs(g - b) < 25:
            pixels[x, y] = (r, g, b, 0)
        elif r > 130 and g > 130 and b > 130 and abs(r - g) < 25 and abs(g - b) < 25:
            # Soft edge blending for text/lines
            avg = (r + g + b) // 3
            alpha = max(0, min(255, int((255 - avg) * 2.8)))
            pixels[x, y] = (r, g, b, alpha)

bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img.save(r"c:\Sentinel-X1.0-main\Sentinel-X1.0-main\public\logo.png", "PNG")
print("Successfully saved crisp transparent logo to public/logo.png!")
