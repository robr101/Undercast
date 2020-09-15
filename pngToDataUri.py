import base64
from PIL import Image

def resize_image(filename, newWidth, newHeight):
    img = Image.open(filename)
    newImg = img.resize((newWidth, newHeight))
    newImg.save(filename)


def image_to_data_url(filename):
    ext = filename.split('.')[-1]
    prefix = f'data:image/{ext};base64,'
    with open(filename, 'rb') as f:
        img = f.read()
    return prefix + base64.b64encode(img).decode('utf-8')

icons = ['01d','01n','02d','02n','03d','03n','04d','04n','09d','09n','10d','10n','11d','11n','13d','13n','50d','50n',]

print("Converting icons from list to dataUri's...")

for icon in icons:
    filename = './new_icons_rz/' + icon + '.png'
    resize_image(filename, 256, 256)
    dataStr = image_to_data_url(filename)
    with open('./new_icons_rz/dataIcons.js', 'a') as f:
        print("Writing " + icon + " to ./dataIcons.js...")
        f.write('"icon_' + icon + '": "' + dataStr + '",\n')

print("Finished.")


# with open('./metal_tex_data_uri.js', 'w') as f:
#     f.write(image_to_data_url('./assets/metal_tex.png'))
    