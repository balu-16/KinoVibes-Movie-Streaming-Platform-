const STORAGE_KEYS = {
    AUTH: 'kinovibes_auth',
    USERNAME: 'kinovibes_username',
    USERS: 'kinovibes_users',
    CURRENT_USER: 'kinovibes_current_user'
};

// Session storage keys for temporary data
const SESSION_KEYS = {
    REMEMBER_USERNAME: 'kinovibes_remember_username'
};

// Default users if none exist in localStorage
const DEFAULT_USERS = [
    {
        username: 'admin',
        password: 'password123',
        email: 'admin@kinovibes.com',
        fullname: 'Administrator',
        role: 'admin'
    },
    {
        username: 'test',
        password: 'test123',
        email: 'test@kinovibes.com',
        fullname: 'Test User',
        role: 'user'
    }
];

/**
 * Initialize users in localStorage if they don't exist
 */
function initializeUsers() {
    // Always ensure the admin user exists with the correct password
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    // Check if admin exists
    const adminIndex = users.findIndex(user => user.username === 'admin');
    
    if (adminIndex === -1) {
        // Admin doesn't exist, add all default users
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    } else {
        // Admin exists, ensure it has the correct password
        users[adminIndex].password = 'password123';
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
}

// Initialize users when script loads
initializeUsers();

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} True if user is logged in
 */
async function checkAuthStatus() {
    return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
}

/**
 * Synchronous wrapper for authentication check
 * Uses cached auth status if available
 * @returns {boolean} True if user is logged in
 */
function isLoggedIn() {
    // Return auth status directly from localStorage
    return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
}

/**
 * Get current user data
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getCurrentUser() {
    const username = localStorage.getItem(STORAGE_KEYS.USERNAME);
    if (!username) return null;
    
    // Get user details from localStorage
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.username === username);
    
    return user || { username, fullname: username };
}

/**
 * Get display name for current user
 * @returns {Promise<string>} User's first name or username
 */
async function getUserDisplayNameAsync() {
    const user = await getCurrentUser();
    if (!user) return 'User';
    
    if (user.fullname) {
        return user.fullname.split(' ')[0]; // Return first name
    }
    
    return user.username;
}

/**
 * Synchronous version that returns a default name
 * but triggers an update if needed
 */
function getUserDisplayName() {
    // Start async fetch but don't wait
    getUserDisplayNameAsync().then(name => {
        if (window._userDisplayName !== name) {
            window._userDisplayName = name;
            // Update UI elements with the user name if needed
            const userDisplayElements = document.querySelectorAll('.user-display-name, #currentUser');
            userDisplayElements.forEach(el => {
                el.textContent = name;
            });
        }
    });
    
    // Return cached value or default
    return window._userDisplayName || 'User';
}

/**
 * Authenticate user
 * @param {string} username Username
 * @param {string} password Password
 * @returns {Promise<Object>} Authentication result
 */
async function authenticateUser(username, password) {
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.username === username);
    
    if (user && user.password === password) {
        localStorage.setItem(STORAGE_KEYS.USERNAME, username);
        localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        
        window._authStatus = true;
        window._userDisplayName = user.fullname 
            ? user.fullname.split(' ')[0] 
            : user.username;
            
        return { success: true, user: { ...user, password: undefined } };
    }
    
    return { success: false, error: 'Invalid username or password' };
}

/**
 * Sign in user 
 * @param {string} username Username
 * @param {boolean} rememberMe Whether to remember the username
 */
async function signInUser(username, rememberMe = false) {
    // Store username in session storage if remember me is checked
    if (rememberMe) {
        sessionStorage.setItem(SESSION_KEYS.REMEMBER_USERNAME, username);
    } else {
        sessionStorage.removeItem(SESSION_KEYS.REMEMBER_USERNAME);
    }
    
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    
    // Auth status is already set in authenticateUser
    window._authStatus = true;
}

/**
 * Sign out user
 */
async function signOutUser() {
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    
    window._authStatus = false;
    window._userDisplayName = null;
    
    window.location.href = 'authentication.html';
}

/**
 * Register a new user
 * @param {Object} userData User data to register
 * @returns {Promise<Object>} Registration result
 */
async function registerUser(userData) {
    // Get existing users
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    // Check if username already exists
    if (users.some(user => user.username === userData.username)) {
        return { 
            success: false, 
            error: 'Username already exists'
        };
    }
    
    // Add new user with default role
    const newUser = {
        ...userData,
        role: 'user'
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    return { 
        success: true, 
        message: 'User registered successfully'
    };
}

/**
 * Get the current page name
 * @returns {string} Current page name (e.g., 'login', 'index')
 */
function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
}

/**
 * Handle redirects based on authentication status
 */
function handleAuthRedirects() {
    const isAuthenticated = isLoggedIn();
    const currentPage = getCurrentPage();
    
    // Pages that should redirect to index if authenticated
    const publicPages = ['login', 'signup', 'verification', 'authentication'];
    
    // Pages that should redirect to login if not authenticated
    const protectedPages = ['index', 'profile', 'video_page', ''];
    
    if (isAuthenticated && publicPages.includes(currentPage)) {
        window.location.href = 'index.html';
        return;
    }
    
    if (!isAuthenticated && protectedPages.includes(currentPage)) {
        window.location.href = 'authentication.html';
        return;
    }
}

/**
 * Update UI elements with user display name
 */
function updateUserDisplay() {
    getUserDisplayName(); // This function updates the UI elements
}

// Export Auth object for global use
const Auth = {
    isLoggedIn,
    authenticateUser,
    signInUser,
    signOutUser,
    registerUser,
    getCurrentUser,
    getUserDisplayName,
    handleAuthRedirects,
    updateUserDisplay,
    
    // Convenience wrappers
    login(username, password, rememberMe = false) {
        let result = false;
        authenticateUser(username, password)
            .then(authResult => {
                if (authResult.success) {
                    signInUser(username, rememberMe);
                    result = true;
                }
            });
        return result;
    },
    
    register(fullname, email, username, password) {
        return registerUser({
            fullname,
            email,
            username,
            password
        });
    },
    
    logout() {
        signOutUser();
    },
    
    userExists(username) {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        return users.some(u => u.username === username);
    }
};

// =============================================
// Authentication Page Functionality
// =============================================

// Initialize authentication page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on
    const isAuthPage = window.location.pathname.includes('authentication.html');
    const isLoginPage = window.location.pathname.includes('login.html');
    const isSignupPage = window.location.pathname.includes('signup.html');
    const isVerificationPage = window.location.pathname.includes('verification.html');
    
    // If we're on the authentication page, set up both login and signup handlers
    if (isAuthPage) {
        setupAuthPageHandlers();
    } 
    // Legacy handlers for redirect pages
    else if (isLoginPage) {
        setupLoginHandlers();
    } 
    else if (isSignupPage) {
        setupSignupHandlers();
    }
    else if (isVerificationPage) {
        setupVerificationHandlers();
    }
    
    // Specific handler for the authentication page with combined forms
    function setupAuthPageHandlers() {
        const loginButton = document.getElementById('loginButton');
        const signupButton = document.getElementById('signupButton');
        const loginError = document.getElementById('loginError');
        const signupError = document.getElementById('signupError');
        const signupSuccess = document.getElementById('signupSuccess');
        
        // Password strength indicator
        const passwordInput = document.getElementById('password');
        const passwordStrength = document.getElementById('passwordStrength');
        const passwordStrengthBar = document.getElementById('passwordStrengthBar');
        const passwordStrengthText = document.getElementById('passwordStrengthText');
        
        // Login form submission
        if (loginButton) {
            loginButton.addEventListener('click', function() {
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;
                const rememberMe = document.getElementById('rememberMe').checked;
                
                if (!username || !password) {
                    loginError.classList.remove('d-none');
                    return;
                }
                
                // Try to log in
                Auth.authenticateUser(username, password).then(result => {
                    if (result.success) {
                        Auth.signInUser(username, rememberMe);
                        // Redirect to main page
                        window.location.href = 'index.html';
                    } else {
                        loginError.classList.remove('d-none');
                    }
                });
            });
        }
        
        // Signup form submission
        if (signupButton) {
            signupButton.addEventListener('click', function() {
                const fullname = document.getElementById('fullname').value;
                const email = document.getElementById('email').value;
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const termsCheck = document.getElementById('termsCheck').checked;
                
                // Reset error/success messages
                signupError.classList.add('d-none');
                signupSuccess.classList.add('d-none');
                
                // Validation
                if (!fullname || !email || !username || !password || !confirmPassword) {
                    signupError.textContent = 'Please fill in all fields.';
                    signupError.classList.remove('d-none');
                    return;
                }
                
                if (!validateEmail(email)) {
                    signupError.textContent = 'Please enter a valid email address.';
                    signupError.classList.remove('d-none');
                    return;
                }
                
                if (password !== confirmPassword) {
                    signupError.textContent = 'Passwords do not match.';
                    signupError.classList.remove('d-none');
                    return;
                }
                
                if (password.length < 8) {
                    signupError.textContent = 'Password must be at least 8 characters.';
                    signupError.classList.remove('d-none');
                    return;
                }
                
                if (!termsCheck) {
                    signupError.textContent = 'You must agree to the Terms of Service.';
                    signupError.classList.remove('d-none');
                    return;
                }
                
                // Check if username already exists
                if (Auth.userExists(username)) {
                    signupError.textContent = 'Username already exists.';
                    signupError.classList.remove('d-none');
                    return;
                }
                
                // Register user
                Auth.register(fullname, email, username, password);
                
                // Show success message
                signupSuccess.classList.remove('d-none');
                
                // Redirect to login form after 2 seconds
                setTimeout(function() {
                    // Switch to login form
                    document.getElementById('loginForm').classList.remove('d-none');
                    document.getElementById('signupForm').classList.add('d-none');
                    document.getElementById('formToggleBtn').textContent = 'Switch to Signup';
                    // Update form title and subtitle
                    document.getElementById('formTitle').textContent = 'Welcome Back!';
                    document.getElementById('formSubtitle').textContent = 'Log in to continue your streaming journey';
                    // Update URL without reload
                    const newUrl = window.location.pathname;
                    window.history.pushState({}, '', newUrl);
                    // Pre-fill username
                    document.getElementById('loginUsername').value = username;
                    // Focus on password field
                    document.getElementById('loginPassword').focus();
                }, 2000);
            });
        }
        
        // Password strength indicator
        if (passwordInput && passwordStrength) {
            passwordInput.addEventListener('input', function() {
                const password = this.value;
                
                if (password.length > 0) {
                    passwordStrength.classList.remove('d-none');
                    
                    // Calculate password strength
                    const strength = calculatePasswordStrength(password);
                    
                    // Update strength bar
                    passwordStrengthBar.style.width = strength.score + '%';
                    passwordStrengthText.textContent = 'Password strength: ' + strength.label;
                    
                    // Set color based on strength
                    passwordStrengthBar.className = 'progress-bar';
                    if (strength.score < 30) {
                        passwordStrengthBar.classList.add('bg-danger');
                    } else if (strength.score < 70) {
                        passwordStrengthBar.classList.add('bg-warning');
                    } else {
                        passwordStrengthBar.classList.add('bg-success');
                    }
                } else {
                    passwordStrength.classList.add('d-none');
                }
            });
        }
    }
    
    // Email validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Password strength calculation function
    function calculatePasswordStrength(password) {
        let score = 0;
        
        // Length
        score += password.length * 4;
        
        // Uppercase letters
        if (/[A-Z]/.test(password)) {
            score += 10;
        }
        
        // Lowercase letters
        if (/[a-z]/.test(password)) {
            score += 10;
        }
        
        // Numbers
        if (/[0-9]/.test(password)) {
            score += 10;
        }
        
        // Special characters
        if (/[^A-Za-z0-9]/.test(password)) {
            score += 15;
        }
        
        // Limit score to 100
        score = Math.min(score, 100);
        
        // Determine label
        let label = 'Too weak';
        if (score > 30) label = 'Weak';
        if (score > 60) label = 'Medium';
        if (score > 80) label = 'Strong';
        if (score > 90) label = 'Very strong';
        
        return {
            score: score,
            label: label
        };
    }
});

// =============================================
// Verification Page Functionality
// =============================================

// Verification page initialization
function initVerificationPage() {
    // Check if user is logged in, otherwise redirect to login page
    if (!isLoggedIn()) {
        window.location.href = 'authentication.html';
        return;
    }
    
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    
    // Get display name for personalized message
    const displayName = getUserDisplayName();
    
    // Update verification title with user's name
    const verificationTitle = document.querySelector('.verification-title');
    if (verificationTitle) {
        verificationTitle.textContent = `Welcome back, ${displayName}!`;
    }
    
    const messages = [
        `Setting up your session, ${displayName}...`,
        "Verifying credentials...",
        "Loading your profile...",
        "Preparing your content..."
    ];
    
    // Set initial message
    statusMessage.textContent = messages[0];
    
    // Start progress animation
    setTimeout(() => {
        progressBar.style.width = '100%';
    }, 100);
    
    // Update status messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
        messageIndex++;
        if (messageIndex < messages.length) {
            statusMessage.textContent = messages[messageIndex];
        } else {
            clearInterval(messageInterval);
        }
    }, 1000);
    
    // Redirect to main page after 4 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 4000);
} 