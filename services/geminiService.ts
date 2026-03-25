
import { GoogleGenAI, Type } from "@google/genai";

// Lazily initialize the Google AI client to prevent app crash on load
// if the API key is not yet available in the environment.
let ai: GoogleGenAI | null = null;
const getAiClient = () => {
    if (!ai) {
        // The API key is sourced from the environment variable `process.env.API_KEY`
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

// Helper function to convert a base64 string to a GenAI content part
const fileToGenerativePart = (base64: string, mimeType: string) => {
  // Extract pure base64 data if the prefix is present
  const base64Data = base64.split(',')[1] || base64;
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

// --- Internal Core Logic ---
// This function is defined stand-alone to prevent self-referential errors
// within the main service object during module initialization.
const _generateBiometricErrorMessage = async (): Promise<string> => {
    try {
      const client = getAiClient();
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a user-friendly error message for a failed biometric (face) verification. Explain that the live photo did not match the registered photo and provide clear, simple instructions on how to take a better picture (e.g., face the camera directly, ensure good lighting).',
      });
      return response.text;
    } catch (error) {
      console.error("Error generating biometric error message:", error);
      return `Your face does not match your stored photo. Please ensure you are the correct person and face the camera directly. Your head should be straight and your eyes should be looking at the lens. For your security, this step is mandatory.`;
    }
};


export const geminiService = {
  generateHomePageScript: async (): Promise<string> => {
    try {
      const client = getAiClient();
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a short, welcoming, and patriotic script (2-3 sentences) for the homepage of a digital voting app for India named "AVA Digital Voting". Mention security and the importance of voting.',
      });
      return response.text;
    } catch (error) {
      console.error("Error generating home page script:", error);
      // Fallback to a static message on error
      return `Namaskar, and welcome to AVA Voting, for a stronger Bharat. Our secure digital platform makes your vote count. First, sign up with your details, and a quick photo. Next, log in using your Aadhar and Voter ID. Our advanced AI will confirm your identity using your face. Once verified, simply select your candidate and confirm your vote. Your voice, your vote, your nation.`;
    }
  },

  generateLoginErrorMessage: async (): Promise<string> => {
    try {
      const client = getAiClient();
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a user-friendly error message for a failed login on a voting app. The user\'s credentials (Aadhar/Voter ID) were not found. Instruct them to double-check their details or sign up if they are a new user.',
      });
      return response.text;
    } catch (error) {
      console.error("Error generating login error message:", error);
      return `We couldn't find your registration details with the information provided. Please check your Voter ID and Aadhar number and try again. If you have not registered yet, please click 'Sign Up' to begin.`;
    }
  },
  
  generateBiometricErrorMessage: _generateBiometricErrorMessage,

  verifyBiometricData: async (registeredPhoto: string, livePhoto: string): Promise<{ isMatch: boolean; message: string }> => {
    try {
      const client = getAiClient();
      const registeredPhotoPart = fileToGenerativePart(registeredPhoto, 'image/jpeg');
      const livePhotoPart = fileToGenerativePart(livePhoto, 'image/jpeg');

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { 
            parts: [
                { text: "Analyze the two images. Are they of the same person? Respond ONLY with a JSON object." },
                registeredPhotoPart,
                livePhotoPart
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isMatch: { type: Type.BOOLEAN, description: "True if the person is the same in both images." }
                },
                required: ["isMatch"]
            }
        }
      });

      const jsonResponse = JSON.parse(response.text);
      if (jsonResponse.isMatch) {
          return { isMatch: true, message: 'Biometric verification successful.' };
      } else {
          const errorMessage = await _generateBiometricErrorMessage();
          return { isMatch: false, message: errorMessage };
      }
    } catch (error) {
      console.error("Error verifying biometric data:", error);
      const errorMessage = await _generateBiometricErrorMessage();
      return { isMatch: false, message: "Could not perform verification. " + errorMessage };
    }
  },

  comparePhotosForUniqueness: async (newPhoto: string, existingPhotos: string[]): Promise<{ isUnique: boolean; message: string }> => {
    // To optimize performance, we'll compare against a recent subset of photos.
    const MAX_PHOTOS_TO_COMPARE = 5; 
    const photosToCompare = existingPhotos.slice(-MAX_PHOTOS_TO_COMPARE);

    if (photosToCompare.length === 0) {
      return { isUnique: true, message: 'Photo is unique.' };
    }

    try {
        const client = getAiClient();
        const newPhotoPart = fileToGenerativePart(newPhoto, 'image/jpeg');
        const existingPhotoParts = photosToCompare.map(p => fileToGenerativePart(p, 'image/jpeg'));
        
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Analyze the images. Is the person in the first image present in any of the following images? Respond ONLY with a JSON object." },
                    newPhotoPart,
                    ...existingPhotoParts
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isMatchFound: { type: Type.BOOLEAN, description: "True if a match is found." }
                    },
                    required: ["isMatchFound"]
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);

        if (jsonResponse.isMatchFound) {
            return {
                isUnique: false,
                message: 'This photo appears to match an existing registered user. Each voter must register with a unique photo.'
            };
        } else {
            return {
                isUnique: true,
                message: 'Photo is unique.'
            };
        }
    } catch (error) {
        console.error("Error comparing photo uniqueness:", error);
        // Fallback to allow registration if API fails, to avoid blocking users.
        return { isUnique: true, message: 'Could not verify photo uniqueness due to an error.' };
    }
  },
};
