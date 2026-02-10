from PIL import Image

# Open the original logo
logo = Image.open('public/logo.png')

# Create a new square image with white background
size = 512
square_img = Image.new('RGBA', (size, size), (255, 255, 255, 255))

# Calculate scaling to fit logo in square with padding
padding = 60  # pixels of padding on each side
max_logo_size = size - (2 * padding)

# Get logo dimensions
logo_width, logo_height = logo.size

# Calculate scale factor to fit logo within max size
scale = min(max_logo_size / logo_width, max_logo_size / logo_height)

# Resize logo
new_width = int(logo_width * scale)
new_height = int(logo_height * scale)
logo_resized = logo.resize((new_width, new_height), Image.Resampling.LANCZOS)

# Calculate position to center the logo
x = (size - new_width) // 2
y = (size - new_height) // 2

# Paste logo onto square background
square_img.paste(logo_resized, (x, y), logo_resized if logo_resized.mode == 'RGBA' else None)

# Save as icon-512x512.png
square_img.save('public/icon-512x512.png', 'PNG', optimize=True)

# Also create 192x192 version
square_img_192 = square_img.resize((192, 192), Image.Resampling.LANCZOS)
square_img_192.save('public/icon-192x192.png', 'PNG', optimize=True)

print("Square icons created successfully!")
print("- icon-512x512.png (512x512)")
print("- icon-192x192.png (192x192)")
