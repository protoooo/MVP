// components/ErrorMessage.js - User-friendly error messages for restaurant staff

const ERROR_MESSAGES = {
  // Auth errors
  'NO_ACTIVE_SUBSCRIPTION': {
    title: 'Subscription Required',
    message: 'Your restaurant needs an active subscription to use protocolLM. Please contact your manager or sign up.',
    action: 'View Plans',
    friendly: true
  },
  'Terms not accepted': {
    title: 'Terms & Privacy Update',
    message: 'We've updated our Terms of Service and Privacy Policy. Please review and accept to continue.',
    action: 'Review & Accept',
    friendly: true
  },
  'USAGE_LIMIT_REACHED': {
    title: 'Monthly Usage Limit Reached',
    message: 'Your restaurant has used all monthly checks (1,300 units). Photos count as 2 units, text as 1. Contact support to increase your limit.',
    action: 'Contact Support',
    friendly: true
  },
  
  // Technical errors (simplified for end users)
  'OPENAI_TIMEOUT': {
    title: 'Analysis Taking Too Long',
    message: 'The system is busy right now. Please try your photo or question again in a moment.',
    action: 'Try Again',
    friendly: true
  },
  'NO_DOCUMENT_CONTEXT': {
    title: 'Cannot Find Regulations',
    message: 'We couldn't find relevant Washtenaw County regulations for this question. Try rephrasing or contact support.',
    action: 'Try Different Question',
    friendly: true
  },
  'CAPTCHA_FAILED': {
    title: 'Security Check Failed',
    message: 'Please try again. If this keeps happening, check your internet connection or contact support.',
    action: 'Retry',
    friendly: true
  },
  
  // Default fallback
  'DEFAULT': {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem continues.',
    action: 'Try Again',
    friendly: true
  }
}

export function getErrorMessage(error) {
  const errorKey = error?.code || error?.message || 'DEFAULT'
  
  // Check for exact match
  if (ERROR_MESSAGES[errorKey]) {
    return ERROR_MESSAGES[errorKey]
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorKey.includes(key) || key.includes(errorKey)) {
      return value
    }
  }
  
  // Return default
  return ERROR_MESSAGES.DEFAULT
}

// Usage example in your chat component:
// const errorInfo = getErrorMessage(error)
// <div className="error-message">
//   <h3>{errorInfo.title}</h3>
//   <p>{errorInfo.message}</p>
//   <button>{errorInfo.action}</button>
// </div>
