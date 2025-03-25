// Check if user is logged in, redirect to login page if not
if (!Auth.isLoggedIn()) {
    window.location.href = 'authentication.html';
}

// Global variable to store movies data
let moviesData = {};

// Load movies data when the page loads
fetch('movies_db.json')
    .then(response => response.json())
    .then(data => {
        moviesData = data;
        // Initialize the gallery with all movies
        updateGallery('all');
        initializeCarousels();
    })
    .catch(error => console.error('Error loading movies:', error));

// Function to filter images based on the search input
function searchImages() {
    const input = document.getElementById("searchInput").value.toLowerCase();
    const imageCards = document.querySelectorAll(".image-card");

    imageCards.forEach((card) => {
        const movieName = card.dataset.name.toLowerCase();
        const movie = moviesData[movieName.toLowerCase()];

        if (movie && (
            movie.title.toLowerCase().includes(input) ||
            movie.description.toLowerCase().includes(input) ||
            movie.genres.some(genre => genre.toLowerCase().includes(input))
        )) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Function to show options when an image is clicked
function showOptions(movieName) {
    const movie = moviesData[movieName.toLowerCase()];
    if (!movie) {
        console.error('Movie not found:', movieName);
        return;
    }

    // Show the modal
    const optionsModal = new bootstrap.Modal(document.getElementById('optionsModal'));
    optionsModal.show();

    // Update modal title with movie name
    document.getElementById('optionsModalLabel').textContent = `${movie.title}`;

    // Set up button actions
    document.getElementById('watchButton').onclick = function () {
        streamMovie(movieName);
    };

    document.getElementById('downloadButton').onclick = function () {
        window.open('https://t.me/kinovibes_movies', '_blank');
    };
}

// Function to filter movies by category
function filterByCategory(category) {
    const imageCards = document.querySelectorAll(".image-card");

    imageCards.forEach((card) => {
        const movieName = card.dataset.name.toLowerCase();
        const movie = moviesData[movieName.toLowerCase()];

        if (category === 'all' || (movie && movie.category === category.toLowerCase())) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Function to update movie gallery
function updateGallery(category) {
    const gallery = document.getElementById('imageGallery');
    gallery.innerHTML = ''; // Clear existing content

    Object.entries(moviesData).forEach(([key, movie]) => {
        if (category === 'all' || movie.category === category) {
            const movieCard = createMovieCard(key, movie);
            gallery.appendChild(movieCard);
        }
    });
}

// Function to create a movie card
function createMovieCard(movieKey, movie) {
    const movieCard = document.createElement('div');
    movieCard.className = 'col-md-3 col-sm-6 mb-4 image-card';
    movieCard.setAttribute('data-name', movieKey);

    movieCard.innerHTML = `
        <div class="movie-card">
            <img src="img/${movieKey.replace(/\s+/g, '').toLowerCase()}.jpg" alt="${movie.title}" class="img-fluid" onclick="streamMovie('${movieKey}')">
            <div class="movie-info-overlay">
                <h3>${movie.title}</h3>
                <p>${movie.genres.join('/')} • ${movie.year}</p>
                <div class="movie-rating">${movie.rating}</div>
                <div class="movie-duration">${movie.duration}</div>
                <div class="movie-buttons">
                    <button class="btn btn-sm btn-light" onclick="streamMovie('${movieKey}')">
                        <i class="fas fa-play"></i> Watch Now
                    </button>
                </div>
            </div>
        </div>
    `;

    return movieCard;
}

// Add event listeners when the document is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", searchImages);
    }

    // Initialize category filters
    const categoryButtons = document.querySelectorAll('.dropdown-item');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const category = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            filterByCategory(category);
        });
    });

    // Set up user info in navbar
    setupUserInfo();

    // Sign out functionality
    const signoutButton = document.getElementById('signoutButton');
    if (signoutButton) {
        signoutButton.addEventListener('click', function () {
            signOutUser();
            window.location.href = 'authentication.html';
        });
    }
});

// Function to set up user info in the navbar
function setupUserInfo() {
    const userDisplay = document.getElementById('currentUser');

    if (userDisplay) {
        // Get the user's display name
        userDisplay.textContent = getUserDisplayName();
    }
}

// Add this function to initialize carousels
function initializeCarousels() {
    const carousels = document.querySelectorAll('.movie-carousel');

    carousels.forEach(carousel => {
        const movieRow = carousel.querySelector('.movie-row');
        const prevBtn = carousel.querySelector('.prev');
        const nextBtn = carousel.querySelector('.next');
        const category = movieRow.dataset.category;

        // Filter and add movies for this category
        const categoryMovies = Object.entries(moviesData)
            .filter(([_, movie]) => movie.category === category);

        categoryMovies.forEach(([key, movie]) => {
            const movieCard = createMovieCard(key, movie);
            movieRow.appendChild(movieCard);
        });

        // Scroll controls
        prevBtn.addEventListener('click', () => {
            movieRow.scrollBy({ left: -220, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            movieRow.scrollBy({ left: 220, behavior: 'smooth' });
        });
    });
}

// Function to stream movie in a new tab
function streamMovie(movieName) {
    const movie = moviesData[movieName.toLowerCase()];

    if (movie && movie.videoUrl) {
        // For Google Drive links, ensure we're using the correct format for direct viewing
        let videoUrl = movie.videoUrl;

        // If it's a Google Drive link, make sure it's in the correct format
        if (videoUrl.includes('drive.google.com')) {
            // Extract file ID from various possible formats
            let fileId;
            if (videoUrl.includes('/file/d/')) {
                fileId = videoUrl.split('/file/d/')[1].split('/')[0];
            } else {
                fileId = videoUrl; // Assume it's already just the ID
            }

            // Use the direct view URL format
            videoUrl = `https://drive.google.com/file/d/${fileId}/view`;
        }

        // Open in a new tab
        window.open(videoUrl, '_blank');
    } else {
        alert('Video not available for this movie.');
    }
}
