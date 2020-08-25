import requests, os

base_url = 'http://openweathermap.org/img/wn/'
os.makedirs('icons', exist_ok=True)
icons = ['01d','01n','02d','02n','03d','03n','04d','04n','09d','09n','10d','10n','11d','11n','13d','13n','50d','50n',]

print("Trying to get all the icons...")
for icon in icons:
    url = base_url + icon + '@2x.png'
    print("getting " + url)
    res = requests.get(url)
    res.raise_for_status()
    print("saving in ")
    img = open('icons/' + icon + '.png', 'wb')
    for chunk in res.iter_content(100000):
        img.write(chunk)
    img.close()

print("done!")


