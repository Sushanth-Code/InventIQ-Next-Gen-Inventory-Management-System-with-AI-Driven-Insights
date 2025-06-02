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
        
        // Handle common speech recognition errors for greetings
        if (transcript.toLowerCase() === 'high') {
          transcript = 'hi';
        }
        
        // Normalize numbers in speech recognition to improve command parsing
        transcript = transcript
          .replace(/product (to|too|two)\b/i, 'product 2') // Fix "product to/too/two" -> "product 2"
          .replace(/product (for|fore|four)\b/i, 'product 4') // Fix "product for/fore/four" -> "product 4"
          .replace(/product (won|one)\b/i, 'product 1') // Fix "product won/one" -> "product 1"
          .replace(/product (tree|three)\b/i, 'product 3') // Fix "product tree/three" -> "product 3"
          .replace(/with (to|too|two)\b/i, 'with 2') // Fix "with to/too/two" -> "with 2"
          .replace(/with (for|fore|four)\b/i, 'with 4') // Fix "with for/fore/four" -> "with 4"
          .replace(/with (won|one)\b/i, 'with 1') // Fix "with won/one" -> "with 1"
          .replace(/with (tree|three)\b/i, 'with 3'); // Fix "with tree/three" -> "with 3"
        
        console.debug('Original transcript:', event.results[0][0].transcript);
        console.debug('Normalized transcript:', transcript);
        
        // Update the query field with the normalized transcript
        setQuery(transcript);
        
        // Process the transcript
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
        
        // Find Heera voice
        const heeraVoice = voices.find(voice => voice.name.includes('Heera'));
        
        if (heeraVoice) {
          // Use Heera voice
          setVoiceIndex(voices.indexOf(heeraVoice));
          // Save voice preference
          localStorage.setItem('preferredVoiceIndex', String(voices.indexOf(heeraVoice)));
        } else if (voices.length > 0) {
          // If Heera not available, use the first available voice
          setVoiceIndex(0);
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
  
  // Handle speech recognition result
  const handleSpeechResult = (result: string) => {
    console.debug('Speech recognition result:', result);
    
    // Normalize the result to improve command recognition
    // Replace common speech recognition errors
    let normalizedResult = result
      .replace(/product (to|too|two)/i, 'product 2') // Fix "product to/too/two" -> "product 2"
      .replace(/product (for|fore|four)/i, 'product 4') // Fix "product for/fore/four" -> "product 4"
      .replace(/with (to|too|two)/i, 'with 2') // Fix "with to/too/two" -> "with 2"
      .replace(/with (for|fore|four)/i, 'with 4'); // Fix "with for/fore/four" -> "with 4"
    
    // Handle specific word misrecognitions
    if (normalizedResult.trim().toLowerCase() === 'high') {
      normalizedResult = 'hi';
    }
    
    // Handle "by" being misrecognized as "bye"
    if (normalizedResult.trim().toLowerCase() === 'by') {
      normalizedResult = 'bye';
    }
    
    console.debug('Normalized speech result:', normalizedResult);
    
    setQuery(normalizedResult);
    handleSubmit(normalizedResult);
  };
  
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
    
    // Find Heera voice
    const heeraVoice = availableVoices.find(voice => voice.name.includes('Heera'));
    if (heeraVoice) {
      utterance.voice = heeraVoice;
    } else if (availableVoices.length > 0 && voiceIndex >= 0) {
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
  console.debug('Parsing inventory command:', commandLower);
  
  // Check if this is a restock or sell command
  let action: 'restock' | 'sell' | null = null;
  if (/\b(restock|add|replenish|increase|can you restock|please restock)\b/i.test(commandLower)) {
    action = 'restock';
  } else if (/\b(sell|sold|purchase|reduce|decrease|can you sell|please sell)\b/i.test(commandLower)) {
    action = 'sell';
  }
  
  console.debug('Detected action:', action);
  if (!action) return { action: null, productIdentifier: null, identifierType: null, quantity: null };
  
  // Extract quantity - check for various natural language patterns
  let quantity = null;
  
  // Pattern 1: "with X units" - "Can you restock product 1 with 100 units"
  const withQuantityMatch = commandLower.match(/\bwith\s+(\d+)\s*(units?|items?|pieces?|qty|quantity)?\b/);
  if (withQuantityMatch) {
    quantity = parseInt(withQuantityMatch[1]);
    console.debug('Extracted quantity from "with X units" pattern:', quantity);
  } 
  // Pattern 2: "X units of product Y" - "Restock 100 units of product 1"
  else {
    const unitsOfProductMatch = commandLower.match(/\b(\d+)\s*(units?|items?|pieces?|qty|quantity)?\s+(?:of|for)\s+(?:product|item)\b/);
    if (unitsOfProductMatch) {
      quantity = parseInt(unitsOfProductMatch[1]);
      console.debug('Extracted quantity from "X units of product" pattern:', quantity);
    }
    // Pattern 3: General quantity pattern
    else {
      const quantityMatch = commandLower.match(/\b(\d+)\s*(units?|items?|pieces?|qty|quantity)?\b/);
      if (quantityMatch) {
        quantity = parseInt(quantityMatch[1]);
        console.debug('Extracted quantity from general pattern:', quantity);
      }
    }
  }
  
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
  
  // STEP 1: PRIORITIZE PRODUCT NAME EXTRACTION FIRST
  // This is the most important change - we look for product names BEFORE numeric IDs
  // to avoid misinterpreting numbers in product names as product IDs
  
  // Pattern 1: "Restock [Product Name] with X units"
  // This handles "Restock Samsung Book 2 Pro with 100 units"
  // Also handles "Restock product iPhone SE with 100 units"
  const productWithUnitsMatch = commandLower.match(/\b(?:restock|sell|add|sold)\s+(?:product\s+)?([\w\s\d\-&\.,'\/\(\)\+]+?)\s+with\s+\d+\s*(?:units?|items?|pieces?|qty|quantity)?\b/i);
  if (productWithUnitsMatch && productWithUnitsMatch[1]) {
    const productName = productWithUnitsMatch[1].trim();
    console.debug('Found product name with "with X units" pattern:', productName);
    
    return {
      action,
      productIdentifier: productName,
      identifierType: 'name',
      quantity,
      category
    };
  }
  
  // Pattern 2: Product name in quotes (single or double quotes)
  const quotedProductMatch = command.match(/["']([^"']+)["']/i);
  if (quotedProductMatch) {
    return {
      action,
      productIdentifier: quotedProductMatch[1].trim(),
      identifierType: 'name',
      quantity,
      category
    };
  }
  
  // Pattern 3: Direct product name after action verb
  // This handles "Restock Samsung Book 2 Pro" without "with X units"
  // Also handles "Restock product iPhone SE" by treating "product" as part of the name
  const directProductMatch = commandLower.match(/\b(?:restock|sell|add|sold)\s+(?:product\s+)?([\w\s\d\-&\.,'\/\(\)\+]+?)(?:\s*$|\s+(?:by|with|for|to|from|at|in))/i);
  if (directProductMatch && directProductMatch[1]) {
    const productName = directProductMatch[1].trim();
    if (productName && !/(restock|sell|add|sold)/i.test(productName.toLowerCase())) {
      console.debug('Found product name with direct pattern:', productName);
      return {
        action,
        productIdentifier: productName,
        identifierType: 'name',
        quantity,
        category
      };
    }
  }
  
  // Pattern 4: "X units of [Product Name]"
  const unitsOfProductNameMatch = commandLower.match(/\b\d+\s*(?:units?|items?|pieces?|qty|quantity)?\s+(?:of|for)\s+(?:product\s+)?([\w\s\d\-&\.,'\/\(\)\+]+?)(?:\s*$|\s+(?:by|with|for|to|from|at|in))/i);
  if (unitsOfProductNameMatch && unitsOfProductNameMatch[1] && !unitsOfProductNameMatch[1].match(/^(?:item|number|id|#)\s*\d+$/i)) {
    const productName = unitsOfProductNameMatch[1].trim();
    console.debug('Found product name in "X units of [Product Name]" pattern:', productName);
    return {
      action,
      productIdentifier: productName,
      identifierType: 'name',
      quantity,
      category
    };
  }
  
  // STEP 2: ONLY AFTER TRYING PRODUCT NAMES, CHECK FOR PRODUCT IDs
  
  // Check for specific product ID patterns
  // Pattern 1: "product X" or "product number X" or "item X" where X is a number
  // This should only match when X is a number, not a product name like "iPhone SE"
  const productNumberMatch = commandLower.match(/\b(?:product|item)\s+(?:number\s+|id\s+|#)?(\d+)\b/i);
  if (productNumberMatch) {
    console.debug('Product number match:', productNumberMatch);
    const productId = productNumberMatch[1].trim();
    console.debug('Extracted product ID:', productId);
    
    return {
      action,
      productIdentifier: productId,
      identifierType: 'id',
      quantity,
      category
    };
  }
  
  // Pattern 2: Product ID with P prefix (P123) or SKU format
  const productIdMatch = command.match(/\b([Pp][0-9]{1,5}|[Ss][Kk][Uu][0-9]{1,5})\b/i);
  if (productIdMatch) {
    return {
      action,
      productIdentifier: productIdMatch[1],
      identifierType: 'id',
      quantity,
      category
    };
  }
  
  // Pattern 3: "X units of product Y"
  const unitsOfProductIdMatch = commandLower.match(/\b\d+\s*(?:units?|items?|pieces?|qty|quantity)?\s+(?:of|for)\s+(?:product|item|number|id|#)\s*(\d+)\b/i);
  if (unitsOfProductIdMatch) {
    console.debug('Found product ID in "X units of product Y" pattern:', unitsOfProductIdMatch[1]);
    return {
      action,
      productIdentifier: unitsOfProductIdMatch[1].trim(),
      identifierType: 'id',
      quantity,
      category
    };
  }
  
  // Pattern 5: Product names with model numbers (e.g., "iPhone 13 Pro Max", "Galaxy S22 Ultra")
  const modelNumberMatch = commandLower.match(/\b(?:restock|sell|add|sold)\s+(?:product\s+)?([a-z]+(?:\s+[a-z0-9]+){1,5})\s+(?:model|version|series)\s+([a-z0-9]+)\b/i);
  if (modelNumberMatch) {
    const productName = `${modelNumberMatch[1]} ${modelNumberMatch[2]}`.trim();
    console.debug('Found product with model number:', productName);
    return {
      action,
      productIdentifier: productName,
      identifierType: 'name',
      quantity,
      category
    };
  }

  // Pattern 6: Brand + model pattern (e.g., "Samsung Galaxy S22")
  const brandModelMatch = commandLower.match(/\b(?:restock|sell|add|sold)\s+(?:product\s+)?([a-z]+)\s+([a-z]+)\s+([a-z0-9]+)(?:\s+([a-z0-9]+))?(?:\s+([a-z0-9]+))?\b/i);
  if (brandModelMatch) {
    // Combine the captured groups to form the full product name
    let productName = brandModelMatch[1]; // Brand
    for (let i = 2; i <= 5; i++) {
      if (brandModelMatch[i]) {
        productName += " " + brandModelMatch[i];
      }
    }
    console.debug('Found product with brand + model pattern:', productName);
    return {
      action,
      productIdentifier: productName,
      identifierType: 'name',
      quantity,
      category
    };
  }

  // Pattern 7: Just a number (last resort)
  // Only use this if we haven't found any other product identifier
  const justNumberMatch = commandLower.match(/\b(\d+)\b/);
  const quantityValue = quantity ? quantity.toString() : null;
  if (justNumberMatch && justNumberMatch[1] !== quantityValue) {
    console.debug('Found product ID in general number pattern:', justNumberMatch[1]);
    return {
      action,
      productIdentifier: justNumberMatch[1].trim(),
      identifierType: 'id',
      quantity,
      category
    };
  }
  
  // If we get here, we couldn't identify a product
  return {
    action,
    productIdentifier: null,
    identifierType: null,
    quantity,
    category
  };
};


  // Check if input is a greeting and determine the type of greeting
  const isGreeting = (text: string): { isGreeting: boolean, isHowAreYou: boolean } => {
    // Normalize the text to handle common speech recognition errors
    const normalizedText = text.trim().toLowerCase();
    
    // Special case for "high" being misrecognized as "hi"
    if (normalizedText === 'high') {
      return {
        isGreeting: true,
        isHowAreYou: false
      };
    }
    
    const simpleGreetingPattern = /^(hi|high|hello|hey|greetings|good morning|good afternoon|good evening|howdy|hi there|hello there)\b/i;
    const howAreYouPattern = /^(how are you|how\'s it going|what\'s up|sup|yo)\b|\b(how are you|how\'s it going)\b/i;
    
    const isSimpleGreeting = simpleGreetingPattern.test(normalizedText);
    const isHowAreYou = howAreYouPattern.test(normalizedText);
    
    return {
      isGreeting: isSimpleGreeting || isHowAreYou,
      isHowAreYou: isHowAreYou
    };
  };
  
  // Check if input is a farewell
  const isFarewell = (text: string): boolean => {
    // Normalize the text to handle common speech recognition errors
    const normalizedText = text.trim().toLowerCase();
    
    // Special case for "by" being misrecognized as "bye"
    if (normalizedText === 'by') {
      return true;
    }
    
    const farewellPattern = /^(bye|goodbye|see you|farewell|later|take care|good night|bye bye|cya)\b/i;
    return farewellPattern.test(normalizedText);
  };
  
  // Get appropriate farewell response
  const getFarewellResponse = (): string => {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours < 12) {
      return "Goodbye! Have a wonderful morning!";
    } else if (hours < 17) {
      return "Goodbye! Have a great rest of your day!";
    } else {
      return "Goodbye! Have a pleasant evening!";
    }
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
    console.debug(`Searching for product: ${identifier}, type: ${type}, category: ${category || 'none'}`);
    console.debug(`Available products: ${products.length}`);
    console.debug('All products:', products);
    
    // Normalize the identifier
    const normalizedIdentifier = identifier.toLowerCase().trim();
    
    // SPECIAL CASE: Direct numeric lookup by position
    if (type === 'id' && /^\d+$/.test(normalizedIdentifier)) {
      const numericId = parseInt(normalizedIdentifier);
      
      // Try to find product by position in the array (1-based index)
      if (numericId > 0 && numericId <= products.length) {
        const productByPosition = products[numericId - 1];
        console.debug(`Found product by position ${numericId}:`, productByPosition);
        return productByPosition;
      }
      
      // Try to find product where the ID exactly equals the number
      const productByExactId = products.find(p => 
        p.id === numericId.toString() || 
        p.id === numericId ||
        p.id === `P${numericId}` ||
        p.id === `p${numericId}`
      );
      
      if (productByExactId) {
        console.debug(`Found product by exact numeric ID: ${productByExactId.name} (${productByExactId.id})`);
        return productByExactId;
      }
      
      // Try to find product where the ID contains the number
      const productByPartialId = products.find(p => 
        String(p.id).includes(numericId.toString()) ||
        p.id.toLowerCase().includes(numericId.toString())
      );
      
      if (productByPartialId) {
        console.debug(`Found product by partial numeric ID: ${productByPartialId.name} (${productByPartialId.id})`);
        return productByPartialId;
      }
      
      // If still no match, try by name containing the number
      const productByNameWithNumber = products.find(p => 
        p.name.includes(numericId.toString())
      );
      
      if (productByNameWithNumber) {
        console.debug(`Found product by name containing number: ${productByNameWithNumber.name} (${productByNameWithNumber.id})`);
        return productByNameWithNumber;
      }
      
      // Last resort: just return the product at that index if it exists
      if (products.length > 0) {
        // Use modulo to ensure we're within bounds
        const index = (numericId - 1) % products.length;
        const fallbackProduct = products[Math.max(0, index)];
        console.debug(`Fallback: returning product at index ${index}:`, fallbackProduct);
        return fallbackProduct;
      }
    }
    
    // If we have both an ID and category, use both to narrow down the search
    if (type === 'id' && category) {
      // First try to find products in the specified category
      const productsInCategory = products.filter(p => 
        p.category && p.category.toLowerCase().includes(category.toLowerCase())
      );
      
      console.debug(`Found ${productsInCategory.length} products in category: ${category}`);
      
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
          console.debug(`Found product in category: ${product.name} (${product.id})`);
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
        console.debug('Available product IDs:', products.map(p => p.id).join(', '));
        
        // Try exact numeric match
        product = products.find(p => 
          p.id === numericId || 
          p.id === String(numericId) ||
          p.id.toLowerCase() === `p${numericId}` || 
          p.id.replace(/^[pP]/, '') === numericId ||
          String(p.id) === numericId
        );
        
        // If still no match, try looser matching
        if (!product) {
          product = products.find(p => 
            p.id.toLowerCase().includes(numericId) ||
            String(p.id).includes(numericId) ||
            // Try matching by index (e.g., product is the 2nd item in the list)
            (products.indexOf(p) + 1) === parseInt(numericId)
          );
        }
        
        if (product) {
          console.debug(`Found product by numeric ID: ${product.name} (${product.id})`);
        } else {
          console.debug(`No product found with numeric ID: ${numericId}`);
        }
      }
      
      return product || null;
    } else if (type === 'name') {
      console.debug('Searching for product by name:', normalizedIdentifier);
      
      // First try exact match
      let product = products.find(p => p.name.toLowerCase() === normalizedIdentifier);
      
      // If no exact match, try partial match
      if (!product) {
        // Log all product names for debugging
        console.debug('Available product names:', products.map(p => p.name).join(', '));
        
        // Try fuzzy matching - more lenient for products with numbers in their names
        // This helps with cases like "Samsung Book 2 Pro"
        product = products.find(p => {
          const productNameLower = p.name.toLowerCase();
          const searchTerms = normalizedIdentifier.split(/\s+/);
          
          // Check if all search terms appear in the product name (in any order)
          return searchTerms.every(term => productNameLower.includes(term));
        });
        
        if (product) {
          console.debug(`Found product by fuzzy name match: ${product.name} (${product.id})`);
        }
        
        // If no fuzzy match, try traditional partial match
        if (!product) {
          product = products.find(p => p.name.toLowerCase().includes(normalizedIdentifier));
          
          if (product) {
            console.debug(`Found product by partial name match: ${product.name} (${product.id})`);
          }
        }
      } else {
        console.debug(`Found product by exact name match: ${product.name} (${product.id})`);
      }
      
      // If we have a category and no product was found, try to find a product that matches both partially
      if (!product && category) {
        product = products.find(p => 
          p.name.toLowerCase().includes(normalizedIdentifier) && 
          p.category && p.category.toLowerCase().includes(category.toLowerCase())
        );
        
        if (product) {
          console.debug(`Found product by name and category: ${product.name} (${product.id})`);
        }
      }
      
      // If still no product found, try looking for a product with this name in any word
      if (!product) {
        const words = normalizedIdentifier.split(/\s+/);
        for (const word of words) {
          if (word.length < 3) continue; // Skip very short words
          
          product = products.find(p => p.name.toLowerCase().includes(word));
          if (product) {
            console.debug(`Found product by word match '${word}': ${product.name} (${product.id})`);
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
      
      console.debug(`Found ${categoryProducts.length} products in category: ${normalizedIdentifier}`);
      return categoryProducts.length > 0 ? categoryProducts[0] : null;
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (submittedQuery?: string) => {
    const currentQuery = submittedQuery || query;
    if (!currentQuery.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      text: currentQuery,
      role: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery(''); // Clear input field
    
    try {
      // Ensure inventory data is loaded before proceeding
      let currentInventoryData = inventoryData;
      if (!currentInventoryData || currentInventoryData.length === 0) {
        console.debug('Inventory data not loaded, fetching now...');
        try {
          currentInventoryData = await inventoryService.getAllProducts();
          setInventoryData(currentInventoryData);
          console.debug('Loaded inventory data:', currentInventoryData);
        } catch (error) {
          console.error('Error fetching inventory data:', error);
        }
      }
      
      // Check for specific questions
      const normalizedQuery = currentQuery.trim().toLowerCase();
      
      // Handle time question
      if (normalizedQuery.includes('what is the time') || normalizedQuery.includes('what time is it')) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timeResponse = `The current time is ${timeString}.`;
        const assistantMessage = {
          text: timeResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        speakText(timeResponse);
        setLoading(false);
        return;
      }
      
      // Handle date question
      if (normalizedQuery.includes('what is the date') || normalizedQuery.includes('what day is it')) {
        const now = new Date();
        const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const dateResponse = `Today is ${dateString}.`;
        const assistantMessage = {
          text: dateResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        speakText(dateResponse);
        setLoading(false);
        return;
      }
      
      // Handle identity question
      if (normalizedQuery.includes('who am i') || normalizedQuery.includes('what is my name') || normalizedQuery.includes('my role')) {
        let identityResponse = '';
        if (user) {
          const role = user.role || 'user';
          identityResponse = `You are logged in as ${user.username || 'a user'} with ${role.toUpperCase()} privileges.`;
        } else {
          identityResponse = 'You are not currently logged in.';
        }
        const assistantMessage = {
          text: identityResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        speakText(identityResponse);
        setLoading(false);
        return;
      }
      
      // Handle assistant name question
      if (normalizedQuery.includes('what is your name') || normalizedQuery.includes('who are you')) {
        const nameResponse = "I am the InventIQ Smart Assistant, designed to help you manage your inventory efficiently.";
        const assistantMessage = {
          text: nameResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        speakText(nameResponse);
        setLoading(false);
        return;
      }
      
      // Check if it's a farewell
      if (isFarewell(currentQuery)) {
        const farewellResponse = getFarewellResponse();
        const assistantMessage = {
          text: farewellResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        speakText(farewellResponse);
        setLoading(false);
        return;
      }
      
      // Check if it's a greeting
      const greetingCheck = isGreeting(currentQuery);
      if (greetingCheck.isGreeting) {
        const greetingResponse = getGreetingResponse(greetingCheck.isHowAreYou);
        const assistantMessage = {
          text: greetingResponse,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        speakText(greetingResponse);
        setLoading(false);
        return;
      }
      
      // Check if it's an inventory command (restock or sell)
      const inventoryCommand = parseInventoryCommand(currentQuery);
      
      if (inventoryCommand.action && inventoryCommand.productIdentifier && inventoryCommand.quantity) {
        // Prepare context for the AI
        const inventoryContext = prepareInventoryContext();
        
        console.debug('Processing inventory command:', inventoryCommand);
        console.debug('Current inventory data length:', currentInventoryData.length);
        
        // Special case for numeric product identifiers
        if (inventoryCommand.identifierType === 'id' && /^\d+$/.test(inventoryCommand.productIdentifier)) {
          const numericId = parseInt(inventoryCommand.productIdentifier);
          
          // If it's a small number and we have products, treat it as an index
          if (numericId > 0 && numericId <= currentInventoryData.length) {
            // Use 1-based indexing (product 1 is the first product)
            const productByIndex = currentInventoryData[numericId - 1];
            console.debug(`Using product at index ${numericId-1}:`, productByIndex);
            
            if (productByIndex) {
              // Process the command with this product
              try {
                let responseText = '';
                
                if (inventoryCommand.action === 'restock') {
                  // Handle restock action
                  const result = await inventoryService.restockProduct(productByIndex.id, inventoryCommand.quantity);
                  const newStockLevel = result.new_stock || (productByIndex.currentStock + inventoryCommand.quantity);
                  responseText = `I've restocked ${inventoryCommand.quantity} units of ${productByIndex.name}. The new stock level is ${newStockLevel} units.`;
                } else if (inventoryCommand.action === 'sell') {
                  // Check if we have enough stock
                  if (productByIndex.currentStock < inventoryCommand.quantity) {
                    responseText = `Sorry, you only have ${productByIndex.currentStock} units of ${productByIndex.name} in stock, which is not enough to sell ${inventoryCommand.quantity} units.`;
                  } else {
                    // Handle sell action
                    const result = await inventoryService.recordTransaction({
                      product_id: productByIndex.id,
                      transaction_type: 'sale',
                      quantity: inventoryCommand.quantity
                    });
                    const newStockLevel = result.updated_stock || (productByIndex.currentStock - inventoryCommand.quantity);
                    responseText = `I've recorded a sale of ${inventoryCommand.quantity} units of ${productByIndex.name}. The new stock level is ${newStockLevel} units.`;
                  }
                }
                
                const assistantMessage = {
                  text: responseText,
                  role: 'assistant' as const,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
                speakText(responseText);
                
                // Refresh inventory data after update
                fetchInventoryData();
                setLoading(false);
                return;
              } catch (error) {
                console.error('Error processing inventory command:', error);
              }
            }
          }
        }
        
        // If special case didn't work, try regular product finding
        const product = findProduct(
          inventoryCommand.productIdentifier,
          inventoryCommand.identifierType || 'name',
          currentInventoryData,
          inventoryCommand.category
        );
        
        if (!product) {
          const notFoundMessage = `I couldn't find a product matching "${inventoryCommand.productIdentifier}". Please check the product name or ID and try again.`;
          const assistantMessage = {
            text: notFoundMessage,
            role: 'assistant' as const,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          speakText(notFoundMessage);
          setLoading(false);
          return;
        }
        
        try {
          let responseText = '';
          
          if (inventoryCommand.action === 'restock') {
            // Handle restock action
            const result = await inventoryService.restockProduct(product.id, inventoryCommand.quantity);
            const newStockLevel = result.new_stock || (product.currentStock + inventoryCommand.quantity);
            responseText = `I've restocked ${inventoryCommand.quantity} units of ${product.name}. The new stock level is ${newStockLevel} units.`;
          } else if (inventoryCommand.action === 'sell') {
            // Check if we have enough stock
            if (product.currentStock < inventoryCommand.quantity) {
              responseText = `Sorry, you only have ${product.currentStock} units of ${product.name} in stock, which is not enough to sell ${inventoryCommand.quantity} units.`;
            } else {
              // Handle sell action
              const result = await inventoryService.recordTransaction({
                product_id: product.id,
                transaction_type: 'sale',
                quantity: inventoryCommand.quantity
              });
              const newStockLevel = result.updated_stock || (product.currentStock - inventoryCommand.quantity);
              responseText = `I've recorded a sale of ${inventoryCommand.quantity} units of ${product.name}. The new stock level is ${newStockLevel} units.`;
            }
          }
          
          const assistantMessage = {
            text: responseText,
            role: 'assistant' as const,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          speakText(responseText);
          
          // Refresh inventory data after update
          fetchInventoryData();
          
        } catch (error) {
          console.error('Error updating inventory:', error);
          const errorMessage = 'Sorry, there was an error updating the inventory. Please try again later.';
          const assistantMessage = {
            text: errorMessage,
            role: 'assistant' as const,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          speakText(errorMessage);
        }
        
        setLoading(false);
        return;
      }
      
      // For other queries, use the LLM service
      const result = await predictionService.getLLMInsights(currentQuery);
      
      const assistantMessage = {
        text: result.insights,
        role: 'assistant' as const,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      // Use the same response for both typed and spoken responses
      speakText(result.insights);
      
    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
      const assistantMessage = {
        text: errorMessage,
        role: 'assistant' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      speakText(errorMessage);
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
                {/* Voice selection removed - only Heera voice is used */}
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
