import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Slider
} from '@mui/material';
import { 
  Send as SendIcon, 
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
  ExpandMore,
  ExpandLess,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  AutoGraph as AutoGraphIcon,
  Inventory as InventoryIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { ListSubheader } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { inventoryService, predictionService, assistantService } from '../../services/api';

// Smart Inventory Assistant Component with enhanced features
const SmartAssistant: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{text: string, role: 'user' | 'assistant', timestamp: Date}>>([]);
  const [loading, setLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [speaking, setSpeaking] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(0); // For selecting voice
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(true); // Speech enabled by default
  
  // Ref for messages container to auto-scroll
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Fetch inventory data on component mount
  useEffect(() => {
    fetchInventoryData();
    
    // Check if we've shown welcome message in this session
    const hasShownWelcome = sessionStorage.getItem('hasShownWelcome') === 'true';
    
    // Add welcome message only once per session
    if (!hasShownWelcome) {
      const welcomeMessageText = "Hello! I'm your Smart Inventory Assistant powered by Llama. I can help you manage your inventory, provide insights, and answer any questions you might have. What would you like to know today?";
      const welcomeMessage = {
        text: welcomeMessageText,
        role: 'assistant' as const,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      
      // Mark that we've shown the welcome message
      sessionStorage.setItem('hasShownWelcome', 'true');
      
      // Store welcome message text for speech
      sessionStorage.setItem('welcomeMessageText', welcomeMessageText);
    }
    
    // Initialize speech recognition if available
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        // Get the raw transcript from speech recognition
        let transcript = event.results[0][0].transcript;
        
        // Clean up the transcript - remove trailing periods and other punctuation
        transcript = transcript.trim().replace(/[.!?]+$/, '');
        
        // Update the query field with the cleaned transcript
        setQuery(transcript);
        
        // Process the transcript - ensure we pass a string
        handleSubmit(transcript);
      };
      
      recognition.onend = () => {
        setListening(false);
      };
      
      setSpeechRecognition(recognition);
    }
    
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      // Get available voices
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Try to get saved voice preference
        const savedVoiceIndex = localStorage.getItem('preferredVoiceIndex');
        
        if (savedVoiceIndex && voices.length > Number(savedVoiceIndex)) {
          // Use saved voice preference if available
          setVoiceIndex(Number(savedVoiceIndex));
        } else {
          // Group voices by gender for better selection
          const maleVoices = voices.filter(voice => 
            voice.name.includes('Male') || 
            voice.name.includes('male')
          );
          
          const femaleVoices = voices.filter(voice => 
            voice.name.includes('Female') || 
            voice.name.includes('female')
          );
          
          // Set default voice - try to find a good quality voice
          if (maleVoices.length > 0) {
            // Set default to first male voice found
            setVoiceIndex(voices.indexOf(maleVoices[0]));
          } else if (femaleVoices.length > 0) {
            // If no male voices, use female voice
            setVoiceIndex(voices.indexOf(femaleVoices[0]));
          } else if (voices.length > 0) {
            // If no gender-specific voices, use the first available voice
            setVoiceIndex(0);
          }
        }
      };
      
      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
      
      updateVoices();
      
      // Speak the welcome message if it exists and speech is enabled
      setTimeout(() => {
        const welcomeText = sessionStorage.getItem('welcomeMessageText');
        if (welcomeText && speechEnabled) {
          speakText(welcomeText);
        }
      }, 1000);
    }
  }, []);
  
  // Fetch inventory data from API
  const fetchInventoryData = async () => {
    try {
      const data = await inventoryService.getAllProducts();
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (!speechRecognition) return;
    
    if (listening) {
      speechRecognition.stop();
      setListening(false);
    } else {
      speechRecognition.start();
      setListening(true);
    }
  };
  
  // Speech synthesis function
  const speakText = (text: string) => {
    if (!speechEnabled || !text) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (availableVoices.length > 0 && voiceIndex >= 0) {
      utterance.voice = availableVoices[voiceIndex];
    }
    
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Handle speech events
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  };
  
  // Toggle speech synthesis
  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
    setSpeechEnabled(!speechEnabled);
  };

  // Prepare inventory context for AI
  const prepareInventoryContext = () => {
    // Count categories
    const categories: {[key: string]: number} = {};
    inventoryData.forEach(item => {
      if (item.category) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      }
    });

    // Get low stock items
    const lowStockItems = inventoryData.filter(item => 
      item.current_stock <= item.reorder_level && item.current_stock > 0
    );

    // Get trending products
    const trendingItems = inventoryData
      .filter(item => item.historical_sales)
      .sort((a, b) => {
        const aValues = Object.values(a.historical_sales || {}) as number[];
        const bValues = Object.values(b.historical_sales || {}) as number[];
        const aSum = aValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        const bSum = bValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        return bSum - aSum;
      })
      .slice(0, 5);

    return `
    Current Inventory Context:
    - Total Products: ${inventoryData.length}
    - Categories: ${Object.keys(categories).join(', ')}
    - Low Stock Items: ${lowStockItems.length} items need restocking
    - Top Trending Products: ${trendingItems.map(item => item.name).join(', ')}
    `;
  };
  
// Parse natural language command for restocking or selling products
const parseInventoryCommand = (command: string): { 
  action: 'restock' | 'sell' | null, 
  productIdentifier: string | null, 
  identifierType: 'id' | 'name' | 'category' | null,
  quantity: number | null,
  category?: string | null
} => {
  const commandLower = command.toLowerCase();
  
  // Check if this is a restock or sell command
  let action: 'restock' | 'sell' | null = null;
  if (/\b(restock|add|replenish|increase)\b/i.test(command)) {
    action = 'restock';
  } else if (/\b(sell|sold|purchase|reduce|decrease)\b/i.test(command)) {
    action = 'sell';
  }
  
  if (!action) return { action: null, productIdentifier: null, identifierType: null, quantity: null };
  
  // Extract quantity
  const quantityMatch = commandLower.match(/\b(\d+)\s*(units?|items?|pieces?|qty|quantity)?\b/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : null;
  
  // Extract category if mentioned
  let category = null;
  const categoryPatterns = [
    /\bin\s+([\w\s&]+?)\s+category\b/i,  // "in toys category"
    /\bfrom\s+([\w\s&]+?)\s+category\b/i, // "from toys category"
    /\bcategory\s+([\w\s&]+?)\b/i,       // "category toys"
    /\b(books|clothing|electronics|groceries|home\s*&?\s*kitchen|toys)\b/i // direct category names
  ];
  
  for (const pattern of categoryPatterns) {
    const match = commandLower.match(pattern);
    if (match) {
      category = match[1].trim();
      break;
    }
  }
  
  // Check for product ID with category pattern (e.g., "product 2 toys")
  const productIdCategoryMatch = commandLower.match(/\bproduct\s+(number\s+)?(#)?(\d+)\s+([\w\s&]+)\b/);
  if (productIdCategoryMatch) {
    return {
      action,
      productIdentifier: productIdCategoryMatch[3].trim(),
      identifierType: 'id',
      quantity,
      category: productIdCategoryMatch[4].trim() || category
    };
  }
  
  // Check for product ID pattern (P followed by numbers)
  const productIdMatch = command.match(/\b([Pp][0-9]{1,4})\b/);
  if (productIdMatch) {
    return {
      action,
      productIdentifier: productIdMatch[1],
      identifierType: 'id',
      quantity,
      category
    };
  }
  
  // Check for patterns like "product X" or "product number X" or "product #X"
  const productNumberMatch = commandLower.match(/\bproduct\s+(number\s+)?(#)?(\d+|\w+)\b/);
  if (productNumberMatch) {
    return {
      action,
      productIdentifier: productNumberMatch[3].trim(),
      identifierType: 'id', // Assume it's an ID if they say "product X"
      quantity,
      category
    };
  }
  
  // Check for just a number that might be a product ID (after checking for product X pattern)
  const justNumberMatch = commandLower.match(/\b(\d+)\b/);
  if (justNumberMatch && justNumberMatch[1] !== (quantityMatch ? quantityMatch[1] : null)) {
    // Make sure this isn't the same number we extracted as quantity
    return {
      action,
      productIdentifier: justNumberMatch[1].trim(),
      identifierType: 'id',
      quantity,
      category
    };
  }
  
  // Try to extract product name and optional category
  // Look for patterns like "Product Name in Category" or "Product Name from Category"
  const productCategoryMatch = commandLower.match(/["']([^"']+)["']\s*(in|from|of)\s*["']?([^"']+)["']?/) ||
                              commandLower.match(/([\w\s]+)\s+(in|from|of)\s+["']?([\w\s]+)["']?/);
  
  if (productCategoryMatch) {
    const extractedCategory = productCategoryMatch[3].trim();
    return {
      action,
      productIdentifier: productCategoryMatch[1].trim(),
      identifierType: 'name',
      quantity,
      category: extractedCategory || category
    };
  }
  
  // Look for product name in quotes or just a sequence of words that's likely the product name
  // First check for quoted product names
  const quotedProductMatch = command.match(/["']([^"']+)["']/);
  if (quotedProductMatch) {
    return {
      action,
      productIdentifier: quotedProductMatch[1].trim(),
      identifierType: 'name',
      quantity,
      category
    };
  }
  
  // Then check for direct product names after action verbs
  // This pattern looks for words after the action verb (restock/sell) and before with/by/for or quantity
  // Use the original command (not lowercase) for matching to preserve case in product names
  const directProductMatch = command.toLowerCase().match(/\b(?:restock|sell|add|sold)\s+([\w\s\d\-&]+?)(?:\s+(?:by|with|for|\d+)|$)/i);
  if (directProductMatch && directProductMatch[1]) {
    // Make sure we're not capturing the action verb itself
    const productName = directProductMatch[1].trim();
    if (productName && !/(restock|sell|add|sold)/i.test(productName.toLowerCase())) {
      return {
        action,
        productIdentifier: productName,
        identifierType: 'name',
        quantity,
        category
      };
    }
  }
  
  return { action, productIdentifier: null, identifierType: null, quantity: null, category };
};

  // Check if input is a greeting and determine the type of greeting
  const isGreeting = (text: string): { isGreeting: boolean, isHowAreYou: boolean } => {
    const simpleGreetingPattern = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|hi there|hello there)\b/i;
    const howAreYouPattern = /^(how are you|how\'s it going|what\'s up|sup|yo)\b|\b(how are you|how\'s it going)\b/i;
    
    const isSimpleGreeting = simpleGreetingPattern.test(text.trim());
    const isHowAreYou = howAreYouPattern.test(text.trim());
    
    return {
      isGreeting: isSimpleGreeting || isHowAreYou,
      isHowAreYou: isHowAreYou
    };
  };
  
  // Get appropriate greeting response based on time of day and greeting type
  const getGreetingResponse = (isHowAreYou: boolean = false): string => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    
    if (hour < 12) {
      timeGreeting = 'Good morning! ';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon! ';
    } else {
      timeGreeting = 'Good evening! ';
    }
    
    if (isHowAreYou) {
      const howAreYouResponses = [
        `I'm doing great, thanks for asking! ${timeGreeting.trim()} How can I help with your inventory today?`,
        `I'm fine, thank you! Ready to assist with your inventory management needs.`,
        `I'm excellent! Always ready to help with your inventory questions.`,
        `I'm doing well! ${timeGreeting.trim()} What inventory information would you like to know about?`
      ];
      return howAreYouResponses[Math.floor(Math.random() * howAreYouResponses.length)];
    } else {
      const standardResponses = [
        `${timeGreeting}How can I help with your inventory today?`,
        `${timeGreeting}Welcome to InventIQ! How can I assist you?`,
        `${timeGreeting}I'm ready to help with your inventory management needs.`,
        `${timeGreeting}What inventory information would you like to know about today?`
      ];
      return standardResponses[Math.floor(Math.random() * standardResponses.length)];
    }
  };

  // Find product by identifier
  const findProduct = (identifier: string, type: 'id' | 'name' | 'category', products: any[], category?: string | null) => {
    // Log the search parameters for debugging
    console.log(`Searching for product: ${identifier}, type: ${type}, category: ${category || 'none'}`);
    console.log(`Available products: ${products.length}`);
    
    // Normalize the identifier
    const normalizedIdentifier = identifier.toLowerCase().trim();
    
    // If we have both an ID and category, use both to narrow down the search
    if (type === 'id' && category) {
      // First try to find products in the specified category
      const productsInCategory = products.filter(p => 
        p.category && p.category.toLowerCase().includes(category.toLowerCase())
      );
      
      console.log(`Found ${productsInCategory.length} products in category: ${category}`);
      
      // Then look for the product with matching ID within that category
      if (productsInCategory.length > 0) {
        // Try exact string match first
        let product = productsInCategory.find(p => 
          p.id.toLowerCase() === normalizedIdentifier ||
          p.id.toLowerCase() === `p${normalizedIdentifier}`
        );
        
        // If no match, try numeric ID match
        if (!product && /^\d+$/.test(normalizedIdentifier)) {
          const numericId = normalizedIdentifier;
          product = productsInCategory.find(p => 
            p.id === numericId || 
            p.id.toLowerCase() === `p${numericId}` || 
            p.id.replace(/^[pP]/, '') === numericId ||
            String(p.id) === numericId ||
            p.id.includes(numericId)
          );
        }
        
        if (product) {
          console.log(`Found product in category: ${product.name} (${product.id})`);
          return product;
        }
      }
    }
    
    // If category-specific search failed or wasn't applicable, fall back to regular search
    if (type === 'id') {
      // First try exact string match
      let product = products.find(p => 
        p.id.toLowerCase() === normalizedIdentifier ||
        p.id.toLowerCase() === `p${normalizedIdentifier}`
      );
      
      // If no match, try numeric ID match (for cases where user says "product 2" and we have product with ID "2")
      if (!product && /^\d+$/.test(normalizedIdentifier)) {
        const numericId = normalizedIdentifier;
        // Log all product IDs for debugging
        console.log('Available product IDs:', products.map(p => p.id).join(', '));
        
        product = products.find(p => 
          p.id === numericId || 
          p.id.toLowerCase() === `p${numericId}` || 
          p.id.replace(/^[pP]/, '') === numericId ||
          String(p.id) === numericId ||
          p.id.toLowerCase().includes(numericId)
        );
        
        if (product) {
          console.log(`Found product by numeric ID: ${product.name} (${product.id})`);
        } else {
          console.log(`No product found with numeric ID: ${numericId}`);
        }
      }
      
      return product || null;
    } else if (type === 'name') {
      // First try exact match
      let product = products.find(p => p.name.toLowerCase() === normalizedIdentifier);
      
      // If no exact match, try partial match
      if (!product) {
        product = products.find(p => p.name.toLowerCase().includes(normalizedIdentifier));
        
        if (product) {
          console.log(`Found product by partial name match: ${product.name} (${product.id})`);
        }
      } else {
        console.log(`Found product by exact name match: ${product.name} (${product.id})`);
      }
      
      // If we have a category and no product was found, try to find a product that matches both partially
      if (!product && category) {
        product = products.find(p => 
          p.name.toLowerCase().includes(normalizedIdentifier) && 
          p.category && p.category.toLowerCase().includes(category.toLowerCase())
        );
        
        if (product) {
          console.log(`Found product by name and category: ${product.name} (${product.id})`);
        }
      }
      
      // If still no product found, try looking for a product with this name in any word
      if (!product) {
        const words = normalizedIdentifier.split(/\s+/);
        for (const word of words) {
          if (word.length < 3) continue; // Skip very short words
          
          product = products.find(p => p.name.toLowerCase().includes(word));
          if (product) {
            console.log(`Found product by word match '${word}': ${product.name} (${product.id})`);
            break;
          }
        }
      }
      
      return product || null;
    } else if (type === 'category') {
      // Return the first product in the specified category
      const categoryProducts = products.filter(p => 
        p.category && p.category.toLowerCase().includes(normalizedIdentifier)
      );
      
      console.log(`Found ${categoryProducts.length} products in category: ${normalizedIdentifier}`);
      return categoryProducts.length > 0 ? categoryProducts[0] : null;
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (submittedQuery?: string) => {
    const queryToSubmit = submittedQuery || query;
    if (!queryToSubmit.trim()) return;
    
    // Add user message to chat
    const userMessage: {
      role: 'user' | 'assistant',
      text: string,
      timestamp: Date
    } = {
      role: 'user',
      text: queryToSubmit,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery(''); // Clear input field 
    try {
      // Check if this is a greeting
      const greetingCheck = isGreeting(queryToSubmit || '');
      if (greetingCheck.isGreeting) {
        const greetingResponse = getGreetingResponse(greetingCheck.isHowAreYou);
        const aiMessage = {
          text: greetingResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        if (speechEnabled) {
          speakText(aiMessage.text);
        }
        setLoading(false);
        return;
      }
      
      // Parse the query to check if it's a restock or sell command
      const parsedCommand = parseInventoryCommand(queryToSubmit || '');
      
      // If it's a valid inventory command with all required information
      if (parsedCommand.action && parsedCommand.productIdentifier && parsedCommand.quantity) {
        // Find the product in our inventory data
        const product = findProduct(
          parsedCommand.productIdentifier, 
          parsedCommand.identifierType || 'name', 
          inventoryData,
          parsedCommand.category
        );
        
        if (product) {
          let responseText = '';
          
          if (parsedCommand.action === 'restock') {
            // Call the restock API
            const result = await inventoryService.restockProduct(product.id, parsedCommand.quantity);
            responseText = `Successfully restocked ${parsedCommand.quantity} units of ${product.name}. New stock level: ${result.new_stock || (product.current_stock + parsedCommand.quantity)}.`;
          } else if (parsedCommand.action === 'sell') {
            // Check if we have enough stock
            if (product.current_stock < parsedCommand.quantity) {
              responseText = `Cannot sell ${parsedCommand.quantity} units of ${product.name}. Only ${product.current_stock} units available in stock.`;
            } else {
              // Record the sale transaction
              const result = await inventoryService.recordTransaction({
                product_id: product.id,
                transaction_type: 'sale',
                quantity: parsedCommand.quantity
              });
              responseText = `Successfully recorded sale of ${parsedCommand.quantity} units of ${product.name}. Remaining stock: ${result.updated_stock}.`;
            }
          }
          
          const aiMessage = {
            text: responseText,
            role: 'assistant' as const,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, aiMessage]);
          if (speechEnabled) {
            speakText(responseText);
          }
          
          // Refresh inventory data after operation
          fetchInventoryData();
        } else {
          // Product not found, send to assistant API for general response
          const result = await assistantService.getInsights(queryToSubmit || '');
          const aiMessage = {
            text: `I couldn't find a product matching "${parsedCommand.productIdentifier}". ${result.insights}`,
            role: 'assistant' as const,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          if (speechEnabled) {
            speakText(aiMessage.text);
          }
        }
      } else {
        // Not a valid inventory command, process as regular query
        const result = await assistantService.getInsights(queryToSubmit || '');
        const aiMessage = {
          text: result.insights || 'Sorry, I could not generate insights at this time.',
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        if (speechEnabled) {
          speakText(result.insights);
        }
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Add error message
      const errorMessage = {
        text: "I'm sorry, I encountered an error while processing your request. Please try again.",
        role: 'assistant' as const,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate AI insights
  const getAIInsights = () => {
    // Count low stock items
    const lowStockCount = inventoryData.filter(item => 
      item.current_stock <= item.reorder_level && item.current_stock > 0
    ).length;
    
    // Get categories
    const categories = Array.from(new Set(inventoryData.map(item => item.category)));
    
    // Get trending products
    const trendingItems = inventoryData
      .filter(item => item.historical_sales)
      .sort((a, b) => {
        const aValues = Object.values(a.historical_sales || {}) as number[];
        const bValues = Object.values(b.historical_sales || {}) as number[];
        const aSum = aValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        const bSum = bValues.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        return bSum - aSum;
      })
      .slice(0, 5);
    
    const insights = [
      {
        title: 'Low Stock Alert',
        description: `You have ${lowStockCount} items that need restocking soon.`,
        icon: <InventoryIcon color="warning" />
      },
      {
        title: 'Trending Products',
        description: `Top trending: ${trendingItems.map(item => item.name).slice(0, 2).join(', ')}`,
        icon: <TrendingUpIcon color="success" />
      },
      {
        title: 'Inventory Health',
        description: `${inventoryData.length} products across ${categories.length} categories`,
        icon: <AutoGraphIcon color="info" />
      },
      {
        title: 'Seasonal Prediction',
        description: 'Based on historical data, prepare for increased demand in Clothing next month.',
        icon: <BarChartIcon color="primary" />
      },
      {
        title: 'Optimization Tip',
        description: 'Consider reducing stock levels for slow-moving items in Home Goods category.',
        icon: <LightbulbIcon color="secondary" />
      }
    ];
    
    return insights;
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Smart Inventory Assistant
      </Typography>
      
      <Typography variant="body1" paragraph>
        Ask questions about your inventory in natural language and get intelligent insights powered by Llama AI.
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
        {/* Chat Interface */}
        <Paper 
          elevation={3} 
          sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column',
            height: 'calc(100vh - 200px)',
            maxWidth: '800px'
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PsychologyIcon color="primary" />
              <Typography variant="h6" component="h2">
                Smart Assistant
              </Typography>
              <Chip 
                label="Powered by Llama" 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={speaking ? "Speaking..." : (speechEnabled ? "Voice output enabled" : "Voice output disabled")}>
                <IconButton 
                  color={speaking ? "secondary" : (speechEnabled ? "primary" : "default")}
                  onClick={toggleSpeech}
                  sx={{ 
                    animation: speaking ? 'pulse 1.5s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 }
                    }
                  }}
                >
                  <VolumeUpIcon />
                </IconButton>
              </Tooltip>
              <IconButton 
                color={listening ? "error" : "primary"}
                onClick={toggleListening}
                disabled={!speechRecognition}
              >
                {listening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              <IconButton onClick={() => setShowSettings(!showSettings)}>
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>
          
          {/* Settings Panel */}
          <Collapse in={showSettings}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" gutterBottom>
                Assistant Settings
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Temperature:</Typography>
                    <Slider
                      value={temperature}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(event: Event, value: number | number[], activeThumb: number) => setTemperature(value as number)}
                      valueLabelDisplay="auto"
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <Tooltip title="Higher values make responses more creative but potentially less accurate">
                      <InfoIcon fontSize="small" color="action" />
                    </Tooltip>
                  </Box>
                </Grid>
                {availableVoices.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">Voice:</Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={voiceIndex}
                          onChange={(e) => {
                            const newIndex = Number(e.target.value);
                            setVoiceIndex(newIndex);
                            // Save voice preference
                            localStorage.setItem('preferredVoiceIndex', String(newIndex));
                          }}
                          size="small"
                        >
                          {/* Group voices by gender */}
                          <ListSubheader>Male Voices</ListSubheader>
                          {availableVoices
                            .filter(voice => voice.name.includes('Male') || voice.name.includes('male'))
                            .map((voice, index) => (
                              <MenuItem key={`male-${index}`} value={availableVoices.indexOf(voice)}>
                                {voice.name} {voice.lang}
                              </MenuItem>
                            ))}
                            
                          <ListSubheader>Female Voices</ListSubheader>
                          {availableVoices
                            .filter(voice => voice.name.includes('Female') || voice.name.includes('female'))
                            .map((voice, index) => (
                              <MenuItem key={`female-${index}`} value={availableVoices.indexOf(voice)}>
                                {voice.name} {voice.lang}
                              </MenuItem>
                            ))}
                            
                          <ListSubheader>Other Voices</ListSubheader>
                          {availableVoices
                            .filter(voice => 
                              !voice.name.includes('Male') && 
                              !voice.name.includes('male') && 
                              !voice.name.includes('Female') && 
                              !voice.name.includes('female')
                            )
                            .map((voice, index) => (
                              <MenuItem key={`other-${index}`} value={availableVoices.indexOf(voice)}>
                                {voice.name} {voice.lang}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
          
          {/* Messages */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((message, index) => (
              <Box 
                key={index} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    maxWidth: '80%',
                    bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                    color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
          
          {/* Input */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask me anything about inventory or general questions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                size="small"
              />
              <IconButton 
                color={listening ? "error" : "primary"}
                onClick={toggleListening}
                disabled={!speechRecognition}
              >
                {listening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              <Button 
                variant="contained" 
                endIcon={<SendIcon />}
                onClick={() => handleSubmit()}
                disabled={loading || !query.trim()}
              >
                Send
              </Button>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
              Try asking anything! For example: "What are the trending products?", "Tell me about inventory management", or even "What's the meaning of life?"
            </Typography>
          </Box>
        </Paper>
        
        {/* AI Insights Panel */}
        <Paper 
          elevation={3} 
          sx={{ 
            width: 300, 
            display: { xs: 'none', md: 'flex' }, 
            flexDirection: 'column',
            height: 'calc(100vh - 200px)',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h3">
              AI Insights
            </Typography>
            <IconButton size="small" onClick={() => setInsightsOpen(!insightsOpen)}>
              {insightsOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={insightsOpen} sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <List>
              {getAIInsights().map((insight, index) => (
                <ListItem key={index} alignItems="flex-start" sx={{ px: 2, py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {insight.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={insight.title}
                    secondary={insight.description}
                    primaryTypographyProps={{ fontWeight: 'bold', variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ p: 2 }}>
              <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    AI Recommendation
                  </Typography>
                  <Typography variant="body2">
                    Based on your current inventory patterns, consider running a promotion for Clothing items to reduce excess stock before the season change.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Collapse>
        </Paper>
      </Box>
    </Box>
  );
};

export default SmartAssistant;
