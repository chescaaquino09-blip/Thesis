
import { supabase } from './supabase.js';

const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');

// Check existing login session
async function checkLogin() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
        window.location.href = 'index.html';
    }
}

checkLogin();

// Login function
loginForm.addEventListener('submit', async function(event) {

    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
    loginMessage.textContent = '';

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginMessage.textContent = error.message;
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
        return;
    }

    window.location.href = 'index.html';

});
