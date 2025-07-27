# LLM API Integration for SDE2 Engineers 🤖

## 🎯 **Overview**

Large Language Model (LLM) API integration is now a fundamental skill for SDE2 engineers. This guide covers practical implementation of major LLM APIs with production-ready patterns, error handling, and optimization strategies.

## 📚 **LLM Providers & Use Cases**

### **🚀 Major LLM APIs**

- **OpenAI GPT-4/GPT-3.5** - General purpose, function calling
- **Anthropic Claude** - Safety-focused, long context
- **Google Gemini** - Multimodal capabilities
- **AWS Bedrock** - Enterprise deployment
- **Azure OpenAI** - Enterprise compliance

---

## 🔧 **OpenAI API Implementation**

### **Basic Integration - Java Spring Boot**

```java
@RestController
@RequestMapping("/api/v1/ai")
public class OpenAIController {

    private final OpenAIService openAIService;
    private final RedisTemplate<String, Object> redisTemplate;

    public OpenAIController(OpenAIService openAIService, RedisTemplate<String, Object> redisTemplate) {
        this.openAIService = openAIService;
        this.redisTemplate = redisTemplate;
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        try {
            // Check cache first
            String cacheKey = generateCacheKey(request);
            ChatResponse cachedResponse = getCachedResponse(cacheKey);
            if (cachedResponse != null) {
                return ResponseEntity.ok(cachedResponse);
            }

            // Build chat completion request
            List<ChatMessage> messages = buildMessages(request);

            ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
                .model("gpt-4")
                .messages(messages)
                .maxTokens(request.getMaxTokens())
                .temperature(request.getTemperature())
                .user(request.getUserId()) // For abuse monitoring
                .build();

            // Make API call with retry logic
            ChatCompletionResult result = callWithRetry(() ->
                openAIService.createChatCompletion(completionRequest));

            // Build response
            ChatResponse response = ChatResponse.builder()
                .content(result.getChoices().get(0).getMessage().getContent())
                .model(result.getModel())
                .usage(mapUsage(result.getUsage()))
                .finishReason(result.getChoices().get(0).getFinishReason())
                .build();

            // Cache successful response
            cacheResponse(cacheKey, response);

            // Log for monitoring
            logApiCall(request, response, result.getUsage());

            return ResponseEntity.ok(response);

        } catch (OpenAIHttpException e) {
            return handleOpenAIError(e);
        } catch (Exception e) {
            log.error("Unexpected error in chat completion", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ChatResponse.error("Internal server error"));
        }
    }

    @PostMapping("/chat/stream")
    public SseEmitter chatStream(@Valid @RequestBody ChatRequest request) {
        SseEmitter emitter = new SseEmitter(30000L); // 30 second timeout

        CompletableFuture.runAsync(() -> {
            try {
                List<ChatMessage> messages = buildMessages(request);

                ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
                    .model("gpt-4")
                    .messages(messages)
                    .maxTokens(request.getMaxTokens())
                    .temperature(request.getTemperature())
                    .stream(true)
                    .user(request.getUserId())
                    .build();

                // Stream response
                openAIService.streamChatCompletion(completionRequest)
                    .doOnNext(chunk -> {
                        try {
                            ChatCompletionChunk choice = chunk.getChoices().get(0);
                            if (choice.getDelta().getContent() != null) {
                                emitter.send(SseEmitter.event()
                                    .name("message")
                                    .data(choice.getDelta().getContent()));
                            }

                            if ("stop".equals(choice.getFinishReason())) {
                                emitter.send(SseEmitter.event()
                                    .name("done")
                                    .data(""));
                                emitter.complete();
                            }
                        } catch (IOException e) {
                            emitter.completeWithError(e);
                        }
                    })
                    .doOnError(emitter::completeWithError)
                    .subscribe();

            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private <T> T callWithRetry(Supplier<T> apiCall) {
        RetryTemplate retryTemplate = RetryTemplate.builder()
            .maxAttempts(3)
            .exponentialBackoff(1000, 2, 10000)
            .retryOn(OpenAIHttpException.class)
            .build();

        return retryTemplate.execute(context -> apiCall.get());
    }

    private ResponseEntity<ChatResponse> handleOpenAIError(OpenAIHttpException e) {
        switch (e.statusCode) {
            case 400:
                return ResponseEntity.badRequest()
                    .body(ChatResponse.error("Invalid request: " + e.getMessage()));
            case 401:
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ChatResponse.error("Authentication failed"));
            case 429:
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ChatResponse.error("Rate limit exceeded"));
            case 500:
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ChatResponse.error("OpenAI service error"));
            default:
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ChatResponse.error("LLM service unavailable"));
        }
    }
}

@Data
@Builder
public class ChatRequest {
    @NotBlank
    private String message;

    @NotBlank
    private String userId;

    private List<ChatMessage> context;

    @Min(1) @Max(4096)
    private Integer maxTokens = 150;

    @DecimalMin("0.0") @DecimalMax("2.0")
    private Double temperature = 0.7;

    private String systemPrompt;
}

@Data
@Builder
public class ChatResponse {
    private String content;
    private String model;
    private UsageInfo usage;
    private String finishReason;
    private String error;

    public static ChatResponse error(String message) {
        return ChatResponse.builder().error(message).build();
    }
}
```

### **Advanced Function Calling**

```java
@Service
public class FunctionCallingService {

    @Autowired
    private WeatherService weatherService;

    @Autowired
    private CalendarService calendarService;

    public ChatResponse chatWithFunctions(ChatRequest request) {
        List<ChatFunction> functions = Arrays.asList(
            createWeatherFunction(),
            createCalendarFunction()
        );

        ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
            .model("gpt-4")
            .messages(buildMessages(request))
            .functions(functions)
            .functionCall("auto")
            .build();

        ChatCompletionResult result = openAIService.createChatCompletion(completionRequest);
        ChatMessage responseMessage = result.getChoices().get(0).getMessage();

        // Check if function call is needed
        if (responseMessage.getFunctionCall() != null) {
            return handleFunctionCall(responseMessage, request);
        }

        return ChatResponse.builder()
            .content(responseMessage.getContent())
            .build();
    }

    private ChatResponse handleFunctionCall(ChatMessage message, ChatRequest originalRequest) {
        FunctionCall functionCall = message.getFunctionCall();
        String functionName = functionCall.getName();
        String arguments = functionCall.getArguments();

        String functionResult;
        switch (functionName) {
            case "get_weather":
                functionResult = executeWeatherFunction(arguments);
                break;
            case "get_calendar_events":
                functionResult = executeCalendarFunction(arguments);
                break;
            default:
                throw new IllegalArgumentException("Unknown function: " + functionName);
        }

        // Create follow-up request with function result
        List<ChatMessage> messages = new ArrayList<>(buildMessages(originalRequest));
        messages.add(message); // Assistant's function call
        messages.add(ChatMessage.builder()
            .role("function")
            .name(functionName)
            .content(functionResult)
            .build());

        ChatCompletionRequest followUpRequest = ChatCompletionRequest.builder()
            .model("gpt-4")
            .messages(messages)
            .build();

        ChatCompletionResult result = openAIService.createChatCompletion(followUpRequest);

        return ChatResponse.builder()
            .content(result.getChoices().get(0).getMessage().getContent())
            .build();
    }

    private ChatFunction createWeatherFunction() {
        return ChatFunction.builder()
            .name("get_weather")
            .description("Get current weather information for a location")
            .parameters(JsonSchemaProperty.builder()
                .type("object")
                .properties(Map.of(
                    "location", JsonSchemaProperty.builder()
                        .type("string")
                        .description("The city and state, e.g. San Francisco, CA")
                        .build(),
                    "unit", JsonSchemaProperty.builder()
                        .type("string")
                        .enumValues(Arrays.asList("celsius", "fahrenheit"))
                        .build()
                ))
                .required(Arrays.asList("location"))
                .build())
            .build();
    }

    private String executeWeatherFunction(String arguments) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode params = mapper.readTree(arguments);
            String location = params.get("location").asText();
            String unit = params.has("unit") ? params.get("unit").asText() : "celsius";

            WeatherInfo weather = weatherService.getCurrentWeather(location, unit);

            return mapper.writeValueAsString(Map.of(
                "location", location,
                "temperature", weather.getTemperature(),
                "condition", weather.getCondition(),
                "humidity", weather.getHumidity(),
                "unit", unit
            ));
        } catch (Exception e) {
            return "{\"error\": \"Unable to fetch weather data\"}";
        }
    }
}
```

---

## 🔧 **Anthropic Claude Integration**

### **Claude API Implementation - Node.js**

```javascript
const { Anthropic } = require("@anthropic-ai/sdk");
const Redis = require("redis");

class ClaudeService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL,
    });
    this.redis.connect();
  }

  async chat(request) {
    try {
      // Validate input
      this.validateRequest(request);

      // Check cache
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Build messages for Claude
      const messages = this.buildClaudeMessages(request);

      const completion = await this.anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
        system: request.systemPrompt || "You are a helpful assistant.",
        messages: messages,
      });

      const response = {
        content: completion.content[0].text,
        model: completion.model,
        usage: {
          inputTokens: completion.usage.input_tokens,
          outputTokens: completion.usage.output_tokens,
          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
        },
        stopReason: completion.stop_reason,
      };

      // Cache response
      await this.redis.setex(cacheKey, 3600, JSON.stringify(response));

      // Log metrics
      this.logMetrics(request, response);

      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async chatStream(request) {
    const messages = this.buildClaudeMessages(request);

    return this.anthropic.messages.stream({
      model: "claude-3-opus-20240229",
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt || "You are a helpful assistant.",
      messages: messages,
    });
  }

  buildClaudeMessages(request) {
    const messages = [];

    // Add conversation history
    if (request.context && request.context.length > 0) {
      request.context.forEach((msg) => {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        });
      });
    }

    // Add current message
    messages.push({
      role: "user",
      content: request.message,
    });

    return messages;
  }

  validateRequest(request) {
    if (!request.message || request.message.trim().length === 0) {
      throw new Error("Message is required");
    }

    if (request.maxTokens && (request.maxTokens < 1 || request.maxTokens > 4096)) {
      throw new Error("maxTokens must be between 1 and 4096");
    }

    if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
      throw new Error("temperature must be between 0 and 1");
    }
  }

  handleError(error) {
    if (error.status === 400) {
      return { error: "Invalid request parameters", details: error.message };
    } else if (error.status === 401) {
      return { error: "Authentication failed" };
    } else if (error.status === 429) {
      return { error: "Rate limit exceeded" };
    } else if (error.status >= 500) {
      return { error: "Claude service error" };
    } else {
      return { error: "Unexpected error", details: error.message };
    }
  }

  generateCacheKey(request) {
    const crypto = require("crypto");
    const content = JSON.stringify({
      message: request.message,
      context: request.context,
      systemPrompt: request.systemPrompt,
      temperature: request.temperature,
    });
    return `claude:${crypto.createHash("md5").update(content).digest("hex")}`;
  }

  logMetrics(request, response) {
    const metrics = {
      timestamp: new Date().toISOString(),
      model: response.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
      stopReason: response.stopReason,
      userId: request.userId,
    };

    console.log("Claude API Metrics:", metrics);

    // Send to monitoring system
    // await this.metricsCollector.record('claude_api_call', metrics);
  }
}

// Express.js endpoints
const express = require("express");
const router = express.Router();
const claudeService = new ClaudeService();

router.post("/claude/chat", async (req, res) => {
  try {
    const response = await claudeService.chat(req.body);

    if (response.error) {
      return res.status(400).json(response);
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/claude/chat/stream", async (req, res) => {
  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const stream = await claudeService.chatStream(req.body);

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta") {
        res.write(`data: ${JSON.stringify({ content: chunk.delta.text })}\n\n`);
      } else if (chunk.type === "message_stop") {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        break;
      }
    }

    res.end();
  } catch (error) {
    res.status(500).json({ error: "Stream error" });
  }
});

module.exports = router;
```

---

## 🔧 **Google Gemini Integration**

### **Gemini API Implementation - Python**

```python
import google.generativeai as genai
import asyncio
import json
import hashlib
import redis
from typing import List, Dict, Optional, AsyncGenerator
from dataclasses import dataclass
from datetime import datetime
import logging

@dataclass
class ChatMessage:
    role: str
    content: str
    timestamp: Optional[datetime] = None

@dataclass
class ChatRequest:
    message: str
    user_id: str
    context: Optional[List[ChatMessage]] = None
    max_tokens: int = 1000
    temperature: float = 0.7
    system_prompt: Optional[str] = None

@dataclass
class ChatResponse:
    content: str
    model: str
    usage: Dict[str, int]
    finish_reason: str
    error: Optional[str] = None

class GeminiService:
    def __init__(self, api_key: str, redis_url: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        self.redis_client = redis.from_url(redis_url)
        self.logger = logging.getLogger(__name__)

    async def chat(self, request: ChatRequest) -> ChatResponse:
        try {
            # Validate request
            self._validate_request(request)

            # Check cache
            cache_key = self._generate_cache_key(request)
            cached_response = self.redis_client.get(cache_key)
            if cached_response:
                return ChatResponse(**json.loads(cached_response))

            # Build conversation history
            chat_history = self._build_chat_history(request)

            # Start chat session
            chat = self.model.start_chat(history=chat_history)

            # Generate response
            response = await asyncio.to_thread(
                chat.send_message,
                request.message,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=request.max_tokens,
                    temperature=request.temperature
                )
            )

            # Process response
            chat_response = ChatResponse(
                content=response.text,
                model='gemini-pro',
                usage={
                    'input_tokens': self._count_tokens(request.message),
                    'output_tokens': self._count_tokens(response.text),
                    'total_tokens': self._count_tokens(request.message) + self._count_tokens(response.text)
                },
                finish_reason=response.candidates[0].finish_reason.name if response.candidates else 'STOP'
            )

            # Cache response
            self.redis_client.setex(
                cache_key,
                3600,
                json.dumps(chat_response.__dict__)
            )

            # Log metrics
            self._log_metrics(request, chat_response)

            return chat_response

        except Exception as e:
            self.logger.error(f"Gemini API error: {str(e)}")
            return ChatResponse(
                content="",
                model="gemini-pro",
                usage={},
                finish_reason="ERROR",
                error=str(e)
            )

    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        try {
            chat_history = self._build_chat_history(request)
            chat = self.model.start_chat(history=chat_history)

            # Generate streaming response
            response = await asyncio.to_thread(
                chat.send_message,
                request.message,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=request.max_tokens,
                    temperature=request.temperature
                ),
                stream=True
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            self.logger.error(f"Gemini streaming error: {str(e)}")
            yield f"Error: {str(e)}"

    def _build_chat_history(self, request: ChatRequest) -> List[Dict]:
        history = []

        if request.context:
            for msg in request.context:
                history.append({
                    'role': 'user' if msg.role == 'user' else 'model',
                    'parts': [msg.content]
                })

        return history

    def _validate_request(self, request: ChatRequest):
        if not request.message or not request.message.strip():
            raise ValueError("Message is required")

        if request.max_tokens < 1 or request.max_tokens > 4096:
            raise ValueError("max_tokens must be between 1 and 4096")

        if request.temperature < 0 or request.temperature > 1:
            raise ValueError("temperature must be between 0 and 1")

    def _generate_cache_key(self, request: ChatRequest) -> str:
        content = {
            'message': request.message,
            'context': [msg.__dict__ for msg in request.context] if request.context else [],
            'system_prompt': request.system_prompt,
            'temperature': request.temperature
        }
        content_str = json.dumps(content, sort_keys=True)
        return f"gemini:{hashlib.md5(content_str.encode()).hexdigest()}"

    def _count_tokens(self, text: str) -> int:
        # Simplified token counting - use actual tokenizer in production
        return len(text.split()) * 1.3  # Rough estimate

    def _log_metrics(self, request: ChatRequest, response: ChatResponse):
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'model': response.model,
            'user_id': request.user_id,
            'input_tokens': response.usage.get('input_tokens', 0),
            'output_tokens': response.usage.get('output_tokens', 0),
            'total_tokens': response.usage.get('total_tokens', 0),
            'finish_reason': response.finish_reason
        }

        self.logger.info(f"Gemini API metrics: {json.dumps(metrics)}")

# FastAPI endpoints
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import uvicorn
import os

app = FastAPI()
gemini_service = GeminiService(
    api_key=os.getenv('GOOGLE_API_KEY'),
    redis_url=os.getenv('REDIS_URL')
)

@app.post("/gemini/chat")
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    response = await gemini_service.chat(request)

    if response.error:
        raise HTTPException(status_code=400, detail=response.error)

    return response

@app.post("/gemini/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    async def generate():
        async for chunk in gemini_service.chat_stream(request):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## ⚡ **Production Optimization Patterns**

### **Rate Limiting & Cost Management**

```java
@Component
public class LLMRateLimiter {

    private final RedisTemplate<String, String> redisTemplate;
    private final MeterRegistry meterRegistry;

    // Token bucket rate limiting
    public boolean allowRequest(String userId, String model) {
        String key = "rate_limit:" + userId + ":" + model;

        // Get current bucket state
        BucketState bucket = getBucketState(key);

        // Calculate tokens to add
        long now = System.currentTimeMillis();
        long tokensToAdd = (now - bucket.lastRefill) / 1000 * bucket.refillRate;
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        // Check if request can be served
        if (bucket.tokens >= 1) {
            bucket.tokens--;
            saveBucketState(key, bucket);
            return true;
        }

        return false;
    }

    // Cost tracking
    public void trackCost(String userId, String model, int inputTokens, int outputTokens) {
        double cost = calculateCost(model, inputTokens, outputTokens);

        // Update user's daily cost
        String dailyKey = "daily_cost:" + userId + ":" + LocalDate.now();
        redisTemplate.opsForValue().increment(dailyKey, cost);
        redisTemplate.expire(dailyKey, Duration.ofDays(1));

        // Update monthly cost
        String monthlyKey = "monthly_cost:" + userId + ":" + YearMonth.now();
        redisTemplate.opsForValue().increment(monthlyKey, cost);
        redisTemplate.expire(monthlyKey, Duration.ofDays(32));

        // Record metrics
        meterRegistry.counter("llm.cost", "user", userId, "model", model)
            .increment(cost);
    }

    private double calculateCost(String model, int inputTokens, int outputTokens) {
        // OpenAI GPT-4 pricing (as of 2024)
        switch (model) {
            case "gpt-4":
                return (inputTokens * 0.03 + outputTokens * 0.06) / 1000;
            case "gpt-3.5-turbo":
                return (inputTokens * 0.001 + outputTokens * 0.002) / 1000;
            case "claude-3-opus":
                return (inputTokens * 0.015 + outputTokens * 0.075) / 1000;
            default:
                return 0.0;
        }
    }
}
```

### **Error Handling & Fallback Strategies**

```java
@Service
public class LLMOrchestrator {

    private final OpenAIService openAIService;
    private final AnthropicService anthropicService;
    private final CircuitBreaker openAICircuitBreaker;
    private final CircuitBreaker anthropicCircuitBreaker;

    public ChatResponse chat(ChatRequest request) {
        List<LLMProvider> providers = Arrays.asList(
            new LLMProvider("openai", openAIService, openAICircuitBreaker),
            new LLMProvider("anthropic", anthropicService, anthropicCircuitBreaker)
        );

        Exception lastException = null;

        for (LLMProvider provider : providers) {
            try {
                if (provider.circuitBreaker.getState() == CircuitBreaker.State.OPEN) {
                    continue; // Skip if circuit breaker is open
                }

                return provider.circuitBreaker.executeSupplier(() -> {
                    return callProvider(provider.name, request);
                });

            } catch (Exception e) {
                lastException = e;
                log.warn("Provider {} failed: {}", provider.name, e.getMessage());

                // Update circuit breaker
                provider.circuitBreaker.onError(0, TimeUnit.MILLISECONDS, e);
            }
        }

        // All providers failed - return cached response or error
        return getCachedResponseOrError(request, lastException);
    }

    private ChatResponse callProvider(String providerName, ChatRequest request) {
        switch (providerName) {
            case "openai":
                return openAIService.chat(request);
            case "anthropic":
                return anthropicService.chat(request);
            default:
                throw new IllegalArgumentException("Unknown provider: " + providerName);
        }
    }

    private ChatResponse getCachedResponseOrError(ChatRequest request, Exception lastException) {
        // Try to find a cached response for similar request
        String cacheKey = generateFallbackCacheKey(request);
        ChatResponse cached = getCachedResponse(cacheKey);

        if (cached != null) {
            cached.setFromCache(true);
            return cached;
        }

        // Return generic error response
        return ChatResponse.builder()
            .error("All LLM providers are currently unavailable")
            .fallbackMessage("I'm sorry, I'm experiencing technical difficulties. Please try again later.")
            .build();
    }
}
```

---

## 📊 **Monitoring & Observability**

### **Comprehensive Metrics Collection**

```java
@Component
public class LLMMetrics {

    private final MeterRegistry meterRegistry;
    private final Timer.Sample sample;

    public void recordApiCall(String provider, String model, int inputTokens,
                             int outputTokens, String status, long latencyMs) {

        // Request count
        meterRegistry.counter("llm.requests.total",
            "provider", provider,
            "model", model,
            "status", status
        ).increment();

        // Token usage
        meterRegistry.counter("llm.tokens.input",
            "provider", provider,
            "model", model
        ).increment(inputTokens);

        meterRegistry.counter("llm.tokens.output",
            "provider", provider,
            "model", model
        ).increment(outputTokens);

        // Latency
        meterRegistry.timer("llm.request.duration",
            "provider", provider,
            "model", model
        ).record(latencyMs, TimeUnit.MILLISECONDS);

        // Cost tracking
        double cost = calculateCost(provider, model, inputTokens, outputTokens);
        meterRegistry.counter("llm.cost",
            "provider", provider,
            "model", model
        ).increment(cost);
    }

    public void recordError(String provider, String errorType, String errorMessage) {
        meterRegistry.counter("llm.errors.total",
            "provider", provider,
            "error_type", errorType
        ).increment();
    }
}
```

---

## 🎯 **Best Practices Summary**

### **✅ Production Readiness Checklist**

#### **Performance**

- ✅ **Caching** - Cache responses for identical requests
- ✅ **Rate Limiting** - Implement token bucket algorithm
- ✅ **Connection Pooling** - Reuse HTTP connections
- ✅ **Async Processing** - Non-blocking API calls

#### **Reliability**

- ✅ **Circuit Breakers** - Fail fast when services are down
- ✅ **Retry Logic** - Exponential backoff with jitter
- ✅ **Fallback Strategies** - Multiple provider support
- ✅ **Timeout Configuration** - Prevent hanging requests

#### **Security**

- ✅ **API Key Management** - Use environment variables
- ✅ **Input Validation** - Sanitize all user inputs
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Audit Logging** - Track all API calls

#### **Cost Management**

- ✅ **Token Counting** - Track input/output tokens
- ✅ **Cost Monitoring** - Real-time cost tracking
- ✅ **Usage Limits** - Per-user spending limits
- ✅ **Model Selection** - Choose appropriate models for tasks

---

## 🚀 **Next Steps**

1. **Implement one provider** completely with error handling
2. **Add caching and rate limiting** for cost optimization
3. **Set up monitoring** for production readiness
4. **Test with real use cases** and optimize performance
5. **Move to [Prompt Engineering](./02-prompt-engineering.md)** for advanced techniques

_LLM API integration is the foundation of modern AI applications. Master these patterns to build production-ready AI features!_
