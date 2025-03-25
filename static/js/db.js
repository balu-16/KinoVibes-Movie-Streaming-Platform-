let SQL;
let db;
let dbInitialized = false;

// Initialize the database
async function initDB() {
    if (dbInitialized) return;
    
    try {
        // Load SQL.js from CDN
        SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });
        
        // Try to load existing database from localStorage
        let dbData = localStorage.getItem('kinovibes_db');
        
        if (dbData) {
            // Convert base64 string back to Uint8Array
            const binaryString = window.atob(dbData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            db = new SQL.Database(bytes);
        } else {
            // Create a new database
            db = new SQL.Database();
            
            // Create tables
            db.run(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    fullname TEXT,
                    email TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            db.run(`
                CREATE TABLE sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    remember_me INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (username) REFERENCES users(username)
                );
            `);
            
            // Insert default admin user
            db.run(`
                INSERT INTO users (username, password, fullname)
                VALUES ('admin', 'password123', 'Administrator');
            `);
            
            // Save the new database
            saveDB();
        }
        
        dbInitialized = true;
        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Database initialization failed:", error);
        // Fall back to localStorage if SQL.js fails
        alert("Database initialization failed. Using localStorage as fallback.");
    }
}

// Save the database to localStorage
function saveDB() {
    if (!db) return;
    
    // Export the database to a Uint8Array
    const data = db.export();
    
    // Convert Uint8Array to base64 string for localStorage
    let binary = '';
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = window.btoa(binary);
    
    // Save to localStorage
    localStorage.setItem('kinovibes_db', base64Data);
}

// User Authentication Functions

/**
 * Register a new user
 * @param {Object} userData User data to register
 * @returns {boolean} True if registration succeeded
 */
async function registerUser(userData) {
    await initDB();
    
    if (!userData || !userData.username || !userData.password) {
        return false;
    }
    
    try {
        // Check if username already exists
        const checkUser = db.exec(`
            SELECT username FROM users WHERE username = '${userData.username}'
        `);
        
        if (checkUser.length > 0 && checkUser[0].values.length > 0) {
            return false; // Username already exists
        }
        
        // Insert new user
        db.run(`
            INSERT INTO users (username, password, fullname, email)
            VALUES (
                '${userData.username}',
                '${userData.password}',
                '${userData.fullname || ''}',
                '${userData.email || ''}'
            )
        `);
        
        saveDB();
        return true;
    } catch (error) {
        console.error("Error registering user:", error);
        return false;
    }
}

/**
 * Authenticate user
 * @param {string} username Username
 * @param {string} password Password
 * @returns {boolean} True if authentication succeeded
 */
async function authenticateUser(username, password) {
    await initDB();
    
    // Check if empty
    if (!username || !password) return false;
    
    try {
        const result = db.exec(`
            SELECT * FROM users
            WHERE username = '${username}' AND password = '${password}'
        `);
        
        return result.length > 0 && result[0].values.length > 0;
    } catch (error) {
        console.error("Error authenticating user:", error);
        return false;
    }
}

/**
 * Sign in user 
 * @param {string} username Username
 * @param {boolean} rememberMe Whether to remember the user
 */
async function signInUser(username, rememberMe = false) {
    await initDB();
    
    try {
        // Clear any existing sessions
        db.run(`
            DELETE FROM sessions
        `);
        
        // Create new session
        db.run(`
            INSERT INTO sessions (username, remember_me)
            VALUES ('${username}', ${rememberMe ? 1 : 0})
        `);
        
        saveDB();
        
        // Still store current user in localStorage for page transitions
        localStorage.setItem('kinovibes_currentUser', username);
        localStorage.setItem('kinovibes_loggedIn', 'true');
        
        if (rememberMe) {
            localStorage.setItem('kinovibes_username', username);
        } else {
            localStorage.removeItem('kinovibes_username');
        }
    } catch (error) {
        console.error("Error signing in user:", error);
    }
}

/**
 * Sign out user
 */
async function signOutUser() {
    await initDB();
    
    try {
        // Clear sessions
        db.run(`
            DELETE FROM sessions
        `);
        
        saveDB();
        
        // Remove from localStorage as well
        localStorage.removeItem('kinovibes_loggedIn');
        localStorage.removeItem('kinovibes_currentUser');
    } catch (error) {
        console.error("Error signing out user:", error);
    }
}

/**
 * Check if user is logged in
 * @returns {boolean} True if user is logged in
 */
async function isLoggedIn() {
    await initDB();
    
    try {
        const result = db.exec(`
            SELECT * FROM sessions
        `);
        
        return result.length > 0 && result[0].values.length > 0;
    } catch (error) {
        console.error("Error checking login status:", error);
        // Fallback to localStorage
        return localStorage.getItem('kinovibes_loggedIn') === 'true';
    }
}

/**
 * Get current user data
 * @returns {Object|null} User object or null if not found
 */
async function getCurrentUser() {
    await initDB();
    
    try {
        const sessions = db.exec(`
            SELECT username FROM sessions
        `);
        
        if (sessions.length === 0 || sessions[0].values.length === 0) {
            return null;
        }
        
        const username = sessions[0].values[0][0];
        
        const users = db.exec(`
            SELECT * FROM users WHERE username = '${username}'
        `);
        
        if (users.length === 0 || users[0].values.length === 0) {
            return null;
        }
        
        const columns = users[0].columns;
        const values = users[0].values[0];
        
        // Convert to object
        const user = {};
        for (let i = 0; i < columns.length; i++) {
            user[columns[i]] = values[i];
        }
        
        return user;
    } catch (error) {
        console.error("Error getting current user:", error);
        
        // Fallback to localStorage
        const username = localStorage.getItem('kinovibes_currentUser');
        return username ? { username } : null;
    }
}

/**
 * Get display name for current user
 * @returns {string} User's first name or username
 */
async function getUserDisplayName() {
    const user = await getCurrentUser();
    if (!user) return 'User';
    
    if (user.fullname) {
        return user.fullname.split(' ')[0]; // Return first name
    }
    
    return user.username;
} 