/**
 * Client-Side Form Validation & Interactive Experience
 *
 * Thoughtfully crafted with UX best practices:
 * - "Reward early, punish late": errors only appear after blur or submission,
 *   but clear immediately as soon as the user corrects their input.
 * - Dynamic password strength calculation with real-time visual meter.
 * - Accessible ARIA attributes for screen readers.
 * - Password visibility toggling with keyboard accessibility.
 * - Graceful toast notification instead of intrusive native browser alerts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const form = document.getElementById('signupForm');
  const submitBtn = document.getElementById('submitBtn');

  // Input fields
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const termsCheckbox = document.getElementById('termsCheck');

  // Password interactive utilities
  const togglePassBtn = document.getElementById('togglePassword');
  const toggleConfirmPassBtn = document.getElementById('toggleConfirmPassword');
  const strengthMeter = document.getElementById('strengthMeter');
  const strengthLabel = document.getElementById('strengthLabel');

  // Success Toast
  const successToast = document.getElementById('successToast');
  const toastCloseBtn = document.getElementById('toastClose');

  // Tracks which fields the user has interacted with
  const touchedFields = new Set();

  /**
   * Validation Rules & Patterns
   *
   * Note on patterns:
   * - Name: supports multi-word names, international accented characters,
   *   hyphens and apostrophes (e.g. "Jean-Luc Picard", "Renée O'Connor").
   * - Email: conforms to practical standard matching RFC 5322 specs.
   * - Password: requires 8+ chars with a balance of lower, upper, digit & symbol.
   */
  const validationRules = {
    name: {
      validate(value) {
        const trimmed = value.trim();
        if (!trimmed) {
          return { valid: false, message: 'Please enter your full name' };
        }
        // At least first and last name (2+ words), letters, accents, apostrophes, hyphens
        const nameRegex = /^[a-zA-Z\u00C0-\u024F]+(?:[' -][a-zA-Z\u00C0-\u024F]+)+$/;
        if (!nameRegex.test(trimmed)) {
          return {
            valid: false,
            message: 'Please include both your first and last name'
          };
        }
        if (trimmed.length < 3) {
          return { valid: false, message: 'Name is a bit too short (minimum 3 characters)' };
        }
        return { valid: true, message: '' };
      }
    },

    email: {
      validate(value) {
        const trimmed = value.trim();
        if (!trimmed) {
          return { valid: false, message: 'Email address is required' };
        }
        // Standard practical email regex supporting modern TLDs
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(trimmed)) {
          return {
            valid: false,
            message: 'Please enter a valid email address (e.g. name@domain.com)'
          };
        }
        return { valid: true, message: '' };
      }
    },

    password: {
      validate(value) {
        if (!value) {
          return { valid: false, message: 'Password is required' };
        }
        if (value.length < 8) {
          return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        if (!/[a-z]/.test(value)) {
          return { valid: false, message: 'Include at least one lowercase letter' };
        }
        if (!/[A-Z]/.test(value)) {
          return { valid: false, message: 'Include at least one uppercase letter' };
        }
        if (!/\d/.test(value)) {
          return { valid: false, message: 'Include at least one number' };
        }
        if (!/[^a-zA-Z0-9]/.test(value)) {
          return { valid: false, message: 'Include at least one special character (!@#$%^&*)' };
        }
        return { valid: true, message: '' };
      }
    },

    confirmPassword: {
      validate(value) {
        if (!value) {
          return { valid: false, message: 'Please confirm your password' };
        }
        if (value !== passwordInput.value) {
          return { valid: false, message: 'Passwords do not match' };
        }
        return { valid: true, message: '' };
      }
    },

    terms: {
      validate(checked) {
        if (!checked) {
          return { valid: false, message: 'You must agree to the Terms & Privacy Policy' };
        }
        return { valid: true, message: '' };
      }
    }
  };

  /**
   * Updates visual state, icons, and error text for a specific field.
   */
  function setFieldState(fieldKey, isValid, message = '') {
    const group = document.querySelector(`.form-group[data-field="${fieldKey}"]`);
    if (!group) return;

    const errorEl = group.querySelector('.error-msg');
    const statusIcon = group.querySelector('.status-icon');
    const inputEl = group.querySelector('input');

    if (isValid) {
      group.classList.remove('has-error');
      group.classList.add('is-valid');

      if (errorEl) errorEl.textContent = '';
      if (inputEl) {
        inputEl.setAttribute('aria-invalid', 'false');
      }

      if (statusIcon) {
        statusIcon.classList.remove('fa-xmark');
        statusIcon.classList.add('fa-check');
      }
    } else {
      group.classList.remove('is-valid');
      group.classList.add('has-error');

      if (errorEl) errorEl.textContent = message;
      if (inputEl) {
        inputEl.setAttribute('aria-invalid', 'true');
      }

      if (statusIcon) {
        statusIcon.classList.remove('fa-check');
        statusIcon.classList.add('fa-xmark');
      }
    }
  }

  /**
   * Resets visual validation states back to pristine clean state.
   */
  function clearFieldState(fieldKey) {
    const group = document.querySelector(`.form-group[data-field="${fieldKey}"]`);
    if (!group) return;

    group.classList.remove('has-error', 'is-valid');
    const errorEl = group.querySelector('.error-msg');
    const statusIcon = group.querySelector('.status-icon');
    const inputEl = group.querySelector('input');

    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.removeAttribute('aria-invalid');
    if (statusIcon) statusIcon.classList.remove('fa-check', 'fa-xmark');
  }

  /**
   * Validates a single input element against its declared rule.
   */
  function validateField(fieldKey) {
    let result = { valid: true, message: '' };

    switch (fieldKey) {
      case 'name':
        result = validationRules.name.validate(nameInput.value);
        break;
      case 'email':
        result = validationRules.email.validate(emailInput.value);
        break;
      case 'password':
        result = validationRules.password.validate(passwordInput.value);
        // Also recheck confirmPassword if it was already filled
        if (touchedFields.has('confirmPassword') && confirmPasswordInput.value) {
          validateField('confirmPassword');
        }
        break;
      case 'confirmPassword':
        result = validationRules.confirmPassword.validate(confirmPasswordInput.value);
        break;
      case 'terms':
        result = validationRules.terms.validate(termsCheckbox.checked);
        break;
    }

    setFieldState(fieldKey, result.valid, result.message);
    return result.valid;
  }

  /**
   * Evaluates password complexity for the dynamic strength bar.
   * Returns a score between 1 (Weak) and 4 (Strong).
   */
  function evaluatePasswordStrength(password) {
    if (!password) return { score: 0, label: 'Enter password' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const labels = {
      0: 'Enter password',
      1: 'Weak (add numbers & symbols)',
      2: 'Fair (add uppercase & symbols)',
      3: 'Good (almost there!)',
      4: 'Strong & secure ✨'
    };

    return { score, label: labels[score] };
  }

  function updateStrengthMeter(password) {
    if (!password) {
      strengthMeter.classList.remove('active');
      strengthMeter.removeAttribute('data-score');
      strengthLabel.textContent = 'Enter password';
      return;
    }

    strengthMeter.classList.add('active');
    const { score, label } = evaluatePasswordStrength(password);
    strengthMeter.setAttribute('data-score', score);
    strengthLabel.textContent = label;
  }

  // --- Real-Time Input Handlers ---

  // Name Field
  nameInput.addEventListener('blur', () => {
    touchedFields.add('name');
    validateField('name');
  });
  nameInput.addEventListener('input', () => {
    if (touchedFields.has('name')) {
      validateField('name');
    }
  });

  // Email Field
  emailInput.addEventListener('blur', () => {
    touchedFields.add('email');
    validateField('email');
  });
  emailInput.addEventListener('input', () => {
    if (touchedFields.has('email')) {
      validateField('email');
    }
  });

  // Password Field
  passwordInput.addEventListener('focus', () => {
    if (passwordInput.value) strengthMeter.classList.add('active');
  });
  passwordInput.addEventListener('input', () => {
    updateStrengthMeter(passwordInput.value);
    if (touchedFields.has('password')) {
      validateField('password');
    }
  });
  passwordInput.addEventListener('blur', () => {
    touchedFields.add('password');
    validateField('password');
  });

  // Confirm Password Field
  confirmPasswordInput.addEventListener('blur', () => {
    touchedFields.add('confirmPassword');
    validateField('confirmPassword');
  });
  confirmPasswordInput.addEventListener('input', () => {
    if (touchedFields.has('confirmPassword')) {
      validateField('confirmPassword');
    }
  });

  // Terms Checkbox
  termsCheckbox.addEventListener('change', () => {
    touchedFields.add('terms');
    validateField('terms');
  });

  // --- Toggle Password Visibility ---
  function setupPasswordToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', !isPassword);
        icon.classList.toggle('fa-eye-slash', isPassword);
      }
      btn.setAttribute(
        'aria-label',
        isPassword ? 'Hide password' : 'Show password'
      );
    });
  }

  setupPasswordToggle(togglePassBtn, passwordInput);
  setupPasswordToggle(toggleConfirmPassBtn, confirmPasswordInput);

  // --- Toast Notification Handling ---
  let toastTimer = null;
  function showToast() {
    if (!successToast) return;
    successToast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      hideToast();
    }, 6000);
  }

  function hideToast() {
    if (successToast) successToast.classList.remove('show');
  }

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', hideToast);
  }

  // --- Form Submission ---
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Mark all as touched on submit attempt
    ['name', 'email', 'password', 'confirmPassword', 'terms'].forEach((field) =>
      touchedFields.add(field)
    );

    const isNameValid = validateField('name');
    const isEmailValid = validateField('email');
    const isPasswordValid = validateField('password');
    const isConfirmValid = validateField('confirmPassword');
    const isTermsValid = validateField('terms');

    const isFormValid =
      isNameValid &&
      isEmailValid &&
      isPasswordValid &&
      isConfirmValid &&
      isTermsValid;

    if (!isFormValid) {
      // Focus on the first invalid field for better accessibility & UX
      const firstInvalid = form.querySelector('.form-group.has-error input');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    // Friendly button feedback & async simulation
    submitBtn.classList.add('loading');
    const originalText = submitBtn.querySelector('.btn-text').textContent;
    submitBtn.querySelector('.btn-text').textContent = 'Creating account...';

    setTimeout(() => {
      submitBtn.classList.remove('loading');
      submitBtn.querySelector('.btn-text').textContent = originalText;

      // Show modern toast
      showToast();

      // Reset form fields cleanly
      form.reset();
      touchedFields.clear();
      ['name', 'email', 'password', 'confirmPassword', 'terms'].forEach(clearFieldState);
      updateStrengthMeter('');
    }, 800);
  });
});
