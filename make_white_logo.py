from PIL import Image

img = Image.open(r"c:\Sentinel-X1.0-main\Sentinel-X1.0-main\public\logo.png").convert("RGBA")
width, height = img.size

pixels = img.load()
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        if a > 10:
            # Check if this pixel belongs to the dark navy "SENTINEL-" text (low red and low green)
            # The globe icon has vibrant blue/purple/cyan colors (g > 70 or b > 150 or r > 100)
            is_dark_text = (r < 60 and g < 60 and b < 100)
            if is_dark_text:
                # Replace dark navy text with crisp white (#ffffff)
                pixels[x, y] = (255, 255, 255, a)

img.save(r"c:\Sentinel-X1.0-main\Sentinel-X1.0-main\public\logo_white.png", "PNG")
print("Successfully generated logo_white.png for dark backgrounds!")
