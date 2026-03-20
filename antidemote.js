// antidemote.js

// Function to prevent admins from being kicked or demoted
function preventAdminDemotion(userId) {
    const admins = getAdmins(); // Assume this function retrieves the list of admin users
    if (admins.includes(userId)) {
        throw new Error('Admin users cannot be kicked or demoted!');
    }
}

// Example usage
try {
    preventAdminDemotion('user123'); // Replace 'user123' with the actual user ID
} catch (error) {
    console.error(error.message);
}