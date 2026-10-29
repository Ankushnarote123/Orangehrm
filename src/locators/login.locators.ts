import { by, type LocatorMap } from './LocatorHelper';

/** Login screen: /auth/login */
export const LoginLocators = {
  title: by.css('.orangehrm-login-title'),
  usernameInput: by.placeholder('Username'),
  passwordInput: by.placeholder('Password'),
  loginButton: by.role('button', { name: 'Login' }),
  errorAlert: by.role('alert'),
  forgotPasswordLink: by.text('Forgot your password?'),
  form: by.css('form.oxd-form'),
} satisfies LocatorMap;
