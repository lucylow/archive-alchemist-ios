from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/archive-alchemist-ios/assets/images/icon.png')
targets = [
    Path('/home/ubuntu/archive-alchemist-ios/assets/images/icon.png'),
    Path('/home/ubuntu/archive-alchemist-ios/assets/images/splash-icon.png'),
    Path('/home/ubuntu/archive-alchemist-ios/assets/images/favicon.png'),
    Path('/home/ubuntu/archive-alchemist-ios/assets/images/android-icon-foreground.png'),
]

image = Image.open(source).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
for target in targets:
    image.save(target, format='PNG', optimize=True, compress_level=9)
