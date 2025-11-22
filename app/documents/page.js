const handleSendMessage = async (e) => {
  e.preventDefault()
  
  if (!input.trim() && !image) return
  if (!canSend) return
  
  const sanitizedInput = input.trim()
  if (sanitizedInput.length > 5000) {
    alert('Message too long. Please keep messages under 5000 characters.')
    return
  }

  setCanSend(false)

  const userMessage = { 
    role: 'user', 
    content: sanitizedInput, 
    image, 
    citations: [] 
  }
  setMessages(prev => [...prev, userMessage])
  setInput('')
  setImage(null)
  setIsLoading(true)

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: sanitizedInput }],
        image: userMessage.image,
        county: userCounty
      })
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment.')
      } else if (response.status === 401) {
        throw new Error('Session expired. Please sign in again.')
      } else {
        throw new Error('An error occurred. Please try again.')
      }
    }

    const data = await response.json()

    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: data.message, citations: data.citations }
    ])

    if (subscriptionInfo) {
      setSubscriptionInfo(prev => ({
        ...prev,
        requestsUsed: prev.requestsUsed + 1,
        imagesUsed: image ? prev.imagesUsed + 1 : prev.imagesUsed
      }))
    }

    setTimeout(saveCurrentChat, 200)
  } catch (err) {
    console.error('Chat error:', err)
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `❌ Error: ${err.message}`,
      citations: []
    }])
  } finally {
    setIsLoading(false)
    setTimeout(() => setCanSend(true), 1000)
  }
}
