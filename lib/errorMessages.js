// lib/errorMessages.js - User-friendly error messages

export const ERROR_MESSAGES = {
  // Auth errors
  'EMAIL_NOT_VERIFIED': {
    title: 'Email Not Verified',
    message: 'Please verify your email address before starting your trial. Check your inbox and spam folder for the verification link.',
    action: 'Resend Verification Email',
    actionUrl: '/verify-email'
  },
  
  'NO_ACTIVE_SUBSCRIPTION': {
    title: 'Subscription Required',
    message: 'Your trial has ended or you need an active subscription to continue using protocolLM.',
    action: 'Start Trial',
    actionUrl: '/?showPricing=true'
  },
  
  'USAGE_LIMIT_REACHED': {
    title: 'Monthly Usage Limit Reached',
    message: 'You\'ve used all 1,300 checks this month. Photos count as 2 checks, text questions as 1. Your limit resets on your next billing date.',
    action: 'Contact Support',
    actionUrl: '/contact'
  },
  
  'CAPTCHA_FAILED': {
    title: 'Security Verification Failed',
    message: 'Please try again. If this keeps happening, check your internet connection or try a different browser.',
    action: 'Try Again'
  },
  
  'NO_DOCUMENT_CONTEXT': {
    title: 'No Regulations Found',
    message: 'We couldn\'t find relevant Washtenaw County food code sections for your question. Try rephrasing or asking something more specific.',
    action: 'Try Different Question'
  },
  
  'OPENAI_TIMEOUT': {
    title: 'Analysis Taking Too Long',
    message: 'The system is busy processing other requests. Please wait 10 seconds and try again.',
    action: 'Try Again'
  },
  
  'RATE_LIMIT': {
    title: 'Too Many Requests',
    message: 'You\'re sending requests too quickly. Please wait a moment before trying again.',
    action: 'Wait and Retry'
  },
  
  'PAYMENT_FAILED': {
    title: 'Payment Failed',
    message: 'We couldn\'t process your payment. Please update your payment method to continue using protocolLM.',
    action: 'Update Payment',
    actionUrl: '/?billing=true'
  },
  
  'SESSION_CONFLICT': {
    title: 'Logged in Elsewhere',
    message: 'Your account was accessed from another device. For security, you\'ve been signed out here.',
    action: 'Sign In Again',
    actionUrl: '/'
  },
  
  // Default
  'DEFAULT': {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again. If the problem continues, contact support.',
    action: 'Try Again'
  }
}

export function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.DEFAULT
}

export function formatErrorForUser(error) {
  const code = error?.code || error?.message || 'DEFAULT'
  const errorInfo = getErrorMessage(code)
  
  return {
    ...errorInfo,
    originalError: error?.message || 'Unknown error'
  }
}
