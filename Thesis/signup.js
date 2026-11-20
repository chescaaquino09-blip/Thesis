
import { supabase } from './supabase.js';

const signupForm = document.getElementById('signupForm');
const signupButton = document.getElementById('signupButton');
const signupMessage = document.getElementById('signupMessage');

signupForm.addEventListener('submit', async function(event) {

    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        signupMessage.textContent = 'Passwords do not match.';
        return;
    }

    signupButton.disabled = true;
    signupButton.textContent = 'Creating Account...';
    signupMessage.textContent = '';

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullname
            }
        }
    });

    if (error) {
        signupMessage.textContent = error.message;
        signupButton.disabled = false;
        signupButton.textContent = 'Create Account';
        return;
    }

    if (data.session) {
        signupMessage.textContent = 'Account created successfully! Redirecting...';

        window.location.href = 'index.html';
    } else {
        signupMessage.textContent =
            'Registration successful! Please check your email to confirm your account before logging in.';

        signupButton.disabled = false;
        signupButton.textContent = 'Create Account';
    }

});
