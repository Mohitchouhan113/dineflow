$destDir = 'c:\Users\mohit\OneDrive\Desktop\restaurant-saas\frontend\public\food-images'
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir }

$urls = @(
    @('burger.jpg', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'),
    @('pizza.jpg', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'),
    @('paneer.jpg', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80'),
    @('biryani.jpg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80'),
    @('chole-bhature.jpg', 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80'),
    @('dosa.jpg', 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80'),
    @('noodles.jpg', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80'),
    @('pasta.jpg', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80'),
    @('sandwich.jpg', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80'),
    @('momos.jpg', 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=800&q=80'),
    @('chaap.jpg', 'https://images.unsplash.com/photo-1568146244603-ea84f076d043?auto=format&fit=crop&w=800&q=80'),
    @('coffee.jpg', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80'),
    @('tea.jpg', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80'),
    @('shake.jpg', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'),
    @('juice.jpg', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=800&q=80'),
    @('fries.jpg', 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80'),
    @('manchurian.jpg', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80'),
    @('fried-rice.jpg', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'),
    @('dal.jpg', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'),
    @('naan.jpg', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'),
    @('thali.jpg', 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80'),
    @('cake.jpg', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'),
    @('ice-cream.jpg', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80'),
    @('default-food.jpg', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80')
)

foreach ($entry in $urls) {
    $file = Join-Path $destDir $entry[0]
    Write-Host "Downloading $($entry[0])..."
    try {
        Invoke-WebRequest -Uri $entry[1] -OutFile $file -UserAgent "Mozilla/5.0" -TimeoutSec 15
    } catch {
        Write-Host "Error downloading $($entry[0]): $_"
    }
}
