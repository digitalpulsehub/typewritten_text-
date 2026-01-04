// Unsplash API Configuration
const unsplashAccessKey = '_f2bL-3s-wq6HC7M_0P-9GDggh5aphw9SN1xSgVa3ho';
const unsplashSecretKey = 'hUHrL3M64Yus23ez9iwL-JpRHs8O2eLTvh1KkXi2H3c';

// Initialize Unsplash client
const unsplash = new Unsplash({
    accessKey: unsplashAccessKey,
    secret: unsplashSecretKey,
    callbackUrl: 'http://localhost:3000/auth'
});

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const suggestionTags = document.querySelectorAll('.suggestion-tag');
const imagesGrid = document.getElementById('imagesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const noResults = document.getElementById('noResults');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const loadMoreButton = document.getElementById('loadMoreButton');
const imageModal = document.getElementById('imageModal');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const photographerName = document.getElementById('photographerName');
const photographerCredit = document.getElementById('photographerCredit');
const imageDescription = document.getElementById('imageDescription');
const downloadButton = document.getElementById('downloadButton');

// State variables
let currentPage = 1;
let currentQuery = '';
let isLoading = false;
let totalResults = 0;
let currentImageUrl = '';
let currentImageId = '';

// Initialize the page with popular images
window.addEventListener('DOMContentLoaded', () => {
    loadPopularImages();
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Search button click
    searchButton.addEventListener('click', performSearch);
    
    // Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Suggestion tags
    suggestionTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const keyword = tag.getAttribute('data-keyword');
            searchInput.value = keyword;
            performSearch();
        });
    });
    
    // Load more button
    loadMoreButton.addEventListener('click', loadMoreImages);
    
    // Modal close button
    modalClose.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imageModal.style.display === 'block') {
            imageModal.style.display = 'none';
        }
    });
    
    // Download button
    downloadButton.addEventListener('click', downloadImage);
}

// Perform search with current query
function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        // If empty search, show popular images
        loadPopularImages();
        return;
    }
    
    currentQuery = query;
    currentPage = 1;
    resultsTitle.textContent = `Results for "${query}"`;
    
    // Clear previous results
    imagesGrid.innerHTML = '';
    noResults.style.display = 'none';
    loadMoreButton.style.display = 'none';
    
    // Show loading
    showLoading(true);
    
    // Search images with horizontal filter
    searchImages(query, currentPage);
}

// Load popular images (initial load)
function loadPopularImages() {
    currentQuery = '';
    currentPage = 1;
    resultsTitle.textContent = 'Popular Horizontal Images';
    
    // Clear previous results
    imagesGrid.innerHTML = '';
    noResults.style.display = 'none';
    loadMoreButton.style.display = 'none';
    
    // Show loading
    showLoading(true);
    
    // Get popular images with landscape orientation filter
    unsplash.photos.listPhotos(currentPage, 12, "popular")
        .then(response => response.json())
        .then(images => {
            showLoading(false);
            
            // Filter for horizontal images (width > height) with strict ratio
            const horizontalImages = images.filter(img => {
                const ratio = img.width / img.height;
                return ratio >= 1.3 && ratio <= 2.5; // Instagram-friendly horizontal ratios
            });
            
            if (horizontalImages.length === 0) {
                noResults.style.display = 'block';
                return;
            }
            
            displayImages(horizontalImages);
            totalResults = horizontalImages.length;
            resultsCount.textContent = horizontalImages.length;
            
            // Show load more button if there are more images
            if (images.length >= 12) {
                loadMoreButton.style.display = 'inline-flex';
            }
        })
        .catch(error => {
            console.error('Error loading popular images:', error);
            showLoading(false);
            noResults.style.display = 'block';
            noResults.innerHTML = `
                <i class="fas fa-exclamation-circle no-results-icon"></i>
                <h3>Error Loading Images</h3>
                <p>Please check your internet connection and try again</p>
            `;
        });
}

// Search images with query
function searchImages(query, page) {
    isLoading = true;
    
    // Using the Unsplash search endpoint with orientation=landscape for horizontal images
    unsplash.search.photos(query, page, 12, { orientation: 'landscape' })
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            isLoading = false;
            
            const images = data.results;
            
            // Additional filter for proper horizontal Instagram format
            const horizontalImages = images.filter(img => {
                const ratio = img.width / img.height;
                return ratio >= 1.3 && ratio <= 2.5; // Instagram-friendly ratios
            });
            
            if (horizontalImages.length === 0) {
                noResults.style.display = 'block';
                loadMoreButton.style.display = 'none';
                return;
            }
            
            displayImages(horizontalImages);
            totalResults = data.total;
            resultsCount.textContent = horizontalImages.length;
            
            // Show load more button if there are more images
            if (page * 12 < data.total) {
                loadMoreButton.style.display = 'inline-flex';
            } else {
                loadMoreButton.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error searching images:', error);
            showLoading(false);
            isLoading = false;
            noResults.style.display = 'block';
            noResults.innerHTML = `
                <i class="fas fa-exclamation-circle no-results-icon"></i>
                <h3>Error Searching Images</h3>
                <p>Please try again or check your internet connection</p>
            `;
            loadMoreButton.style.display = 'none';
        });
}

// Load more images (pagination)
function loadMoreImages() {
    if (isLoading) return;
    
    currentPage++;
    loadMoreButton.disabled = true;
    loadMoreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    
    if (currentQuery) {
        // Search for more images
        searchImages(currentQuery, currentPage);
    } else {
        // Load more popular images
        unsplash.photos.listPhotos(currentPage, 12, "popular")
            .then(response => response.json())
            .then(images => {
                loadMoreButton.disabled = false;
                loadMoreButton.innerHTML = '<i class="fas fa-sync-alt"></i> Load More Horizontal Images';
                
                // Filter for horizontal images with Instagram-friendly ratios
                const horizontalImages = images.filter(img => {
                    const ratio = img.width / img.height;
                    return ratio >= 1.3 && ratio <= 2.5;
                });
                
                if (horizontalImages.length === 0) {
                    // No more horizontal images
                    loadMoreButton.style.display = 'none';
                    return;
                }
                
                displayImages(horizontalImages, true);
                resultsCount.textContent = parseInt(resultsCount.textContent) + horizontalImages.length;
                
                // Hide load more button if less than 12 images returned
                if (images.length < 12) {
                    loadMoreButton.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error loading more images:', error);
                loadMoreButton.disabled = false;
                loadMoreButton.innerHTML = '<i class="fas fa-sync-alt"></i> Load More Horizontal Images';
            });
    }
}

// Display images in the grid
function displayImages(images, append = false) {
    if (!append) {
        imagesGrid.innerHTML = '';
    }
    
    images.forEach(image => {
        // Create image card
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';
        
        // Use regular size for grid, but store full size URL for download
        const imageUrl = image.urls.regular;
        const fullImageUrl = image.urls.full;
        const photographer = image.user.name;
        const description = image.description || image.alt_description || 'No description available';
        const imageId = image.id;
        
        // Calculate aspect ratio for Instagram
        const aspectRatio = (image.width / image.height).toFixed(2);
        
        imageCard.innerHTML = `
            <div class="image-container">
                <img src="${imageUrl}" alt="${description}" loading="lazy">
            </div>
            <div class="image-info">
                <div class="photographer">
                    <img src="${image.user.profile_image.medium}" alt="${photographer}" class="photographer-avatar">
                    <span class="photographer-name">${photographer}</span>
                </div>
                <p class="image-description-short">${description}</p>
                <div class="instagram-ready">
                    <i class="fab fa-instagram"></i>
                    <span>Horizontal format (${image.width}×${image.height})</span>
                </div>
            </div>
        `;
        
        // Add click event to open modal
        imageCard.addEventListener('click', () => {
            openImageModal(fullImageUrl, photographer, description, imageId, image.width, image.height);
        });
        
        imagesGrid.appendChild(imageCard);
    });
}

// Open image modal with full details
function openImageModal(imageUrl, photographer, description, imageId, width, height) {
    modalImage.src = imageUrl;
    modalImage.alt = description;
    photographerName.textContent = photographer;
    photographerCredit.textContent = photographer;
    imageDescription.textContent = description;
    
    // Store current image data for download
    currentImageUrl = imageUrl;
    currentImageId = imageId;
    
    // Show modal
    imageModal.style.display = 'block';
}

// Download image function
function downloadImage() {
    if (!currentImageUrl) return;
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = currentImageUrl;
    link.download = `instagram-horizontal-${currentImageId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show download feedback
    const originalText = downloadButton.innerHTML;
    downloadButton.innerHTML = '<i class="fas fa-check"></i> Download Started!';
    downloadButton.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
        downloadButton.innerHTML = originalText;
        downloadButton.style.backgroundColor = '';
    }, 2000);
}

// Show/hide loading indicator
function showLoading(show) {
    if (show) {
        loadingIndicator.style.display = 'flex';
        loadMoreButton.style.display = 'none';
    } else {
        loadingIndicator.style.display = 'none';
    }
}

// Set initial search examples
searchInput.value = "Italy";