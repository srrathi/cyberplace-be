const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');
const { logger } = require('../../utils/logger');

class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // const models = this.genAI.listModels();
        // // sleep for 1 second
        // setTimeout(() => {
        //     console.log("Models loaded successfully");
        // }, 1000);
        // console.log("Available Gemini models:");
        // for (const model of models) {
        //     console.log(`${model.name} supports: ${model.supportedGenerationMethods.join(', ')}`);
        // }
        // this.genAI.listModels().then(models => console.log(models));
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Cache for 1 hour (3600 seconds)
        this.cache = new NodeCache({ stdTTL: 3600 });
    }

    async generateText(prompt) {
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(prompt);
            const cachedResult = this.cache.get(cacheKey);

            if (cachedResult) {
                logger.info('Returning cached Gemini response');
                return cachedResult;
            }

            // Generate new response
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Cache the result
            this.cache.set(cacheKey, text);
            logger.info('Gemini API called successfully');

            return text;
        } catch (error) {
            logger.error('Gemini API error:', error);
            throw new Error(`Gemini API failed: ${error.message}`);
        }
    }

    async generateMemeCaption(tags) {
        const prompt = `Generate a single, short, funny caption for a cyberpunk meme with tags: ${tags.join(', ')}. 
        
    Requirements:
    - Maximum 100 characters
    - Use cyber/tech slang when appropriate
    - Be witty and engaging
    - Return ONLY the caption text, no explanations or options
    - Make it suitable for a modern meme platform
    
    Example style: "When you hack the matrix but still can't fix your WiFi 💀"
    
    Caption:`;

        const response = await this.generateText(prompt);
        return this.cleanResponse(response, 150);
    }

    async generateMemeVibeDescription(tags) {
        const prompt = `Describe the vibe of a cyberpunk meme with tags: ${tags.join(', ')} in 2-3 sentences.
    
    Requirements:
    - Maximum 200 characters
    - Use modern internet/cyber terminology
    - Capture the mood and energy
    - Return ONLY the description, no explanations
    - Make it sound cool and tech-savvy
    
    Example style: "Pure digital chaos energy. This hits different in the metaverse. Big cyberpunk protagonist vibes."
    
    Vibe:`;

        const response = await this.generateText(prompt);
        return this.cleanResponse(response, 250);
    }

    // Response cleaning utility
    cleanResponse(response, maxLength = 500) {
        if (!response) return '';

        // Remove common AI response prefixes and suffixes
        let cleaned = response
            .replace(/^(Here's|Here are|Caption:|Vibe:|Description:)/i, '')
            .replace(/^["'\s]+|["'\s]+$/g, '') // Remove quotes and whitespace from start/end
            .replace(/\*\*.*?\*\*/g, '') // Remove markdown bold
            .replace(/\n\n.*$/s, '') // Remove everything after double newline (explanations)
            .split('\n')[0] // Take only first line
            .trim();

        // If response contains options, take the first one
        if (cleaned.includes('Option 1') || cleaned.includes('1.')) {
            const lines = cleaned.split('\n');
            for (let line of lines) {
                if (line.length > 10 && !line.includes('Option') && !line.includes('Tags:')) {
                    cleaned = line.replace(/^\d+\.\s*/, '').trim();
                    break;
                }
            }
        }

        // Final cleanup
        cleaned = cleaned
            .replace(/^["'`]+|["'`]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned.length > maxLength ? cleaned.substring(0, maxLength - 3) + '...' : cleaned;
    }

    generateCacheKey(prompt) {
        // Create a simple hash of the prompt for caching
        return Buffer.from(prompt).toString('base64').substring(0, 50);
    }

    // Response cleaning utility
    cleanResponse(response, maxLength = 500) {
        if (!response) return '';

        // Remove common AI response prefixes and suffixes
        let cleaned = response
            .replace(/^(Here's|Here are|Caption:|Vibe:|Description:)/i, '')
            .replace(/^["'\s]+|["'\s]+$/g, '') // Remove quotes and whitespace from start/end
            .replace(/\*\*.*?\*\*/g, '') // Remove markdown bold
            .replace(/\n\n.*$/s, '') // Remove everything after double newline (explanations)
            .split('\n')[0] // Take only first line
            .trim();

        // If response contains options, take the first one
        if (cleaned.includes('Option 1') || cleaned.includes('1.')) {
            const lines = cleaned.split('\n');
            for (let line of lines) {
                if (line.length > 10 && !line.includes('Option') && !line.includes('Tags:')) {
                    cleaned = line.replace(/^\d+\.\s*/, '').trim();
                    break;
                }
            }
        }

        // Final cleanup
        cleaned = cleaned
            .replace(/^["'`]+|["'`]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned.length > maxLength ? cleaned.substring(0, maxLength - 3) + '...' : cleaned;
    }

    // Cache management methods
    getCacheStats() {
        return this.cache.getStats();
    }

    clearCache() {
        this.cache.flushAll();
        logger.info('Gemini cache cleared');
    }

    getCacheSize() {
        return this.cache.keys().length;
    }
}

module.exports = new GeminiService();