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
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
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
    if (!('speechSynthesis' in window) || !speechEnabled) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if available
    if (availableVoices.length > 0 && voiceIndex >= 0) {
      utterance.voice = availableVoices[voiceIndex];
    }
    
    // Configure voice parameters
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
  
  // Handle query submission
  const handleSubmit = async (submittedQuery: string = query) => {
    if (!submittedQuery.trim()) return;
    
    // Add user message
    const userMessage = {
      text: submittedQuery,
      role: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery('');
    
    try {
      // Call our backend assistant API
      console.log('Sending query to assistant API:', submittedQuery);
      const result = await assistantService.getInsights(submittedQuery);
      console.log('Received response from assistant API:', result);
      
      // Add AI message
      const aiMessage = {
        text: result.insights || 'Sorry, I could not generate insights at this time.',
        role: 'assistant' as const,
        timestamp: new Date()
      };
      console.log('Created AI message:', aiMessage);
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the response if speech is enabled
      if (speechEnabled) {
        speakText(result.insights);
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
