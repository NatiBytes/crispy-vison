import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { HfInference } from '@huggingface/inference';
import { ImageIcon, Upload, Loader2, FileText, Image as ImageLucide } from 'lucide-react';

const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY || '');

type Result = {
  description: string;
  textContent: string;
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Get image description using BLIP
      const descriptionResponse = await hf.imageToText({
        model: 'Salesforce/blip-image-captioning-large',
        data: await file.arrayBuffer(),
      });

      // Get text from image using Microsoft's OCR model instead
      const textResponse = await hf.imageToText({
        model: 'microsoft/trocr-large-handwritten',
        data: await file.arrayBuffer(),
      });

      return {
        description: descriptionResponse.generated_text,
        textContent: textResponse.generated_text || 'No text detected in the image'
      };
    } catch (err) {
      console.error('Error processing image:', err);
      if (err instanceof Error) {
        throw new Error(`Failed to process image: ${err.message}`);
      }
      throw new Error('Failed to process image. Please check your API key and try again.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setResults(null);
    setError(null);
    setLoading(true);

    try {
      const results = await processImage(file);
      setResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Image Analysis</h1>
          <p className="text-lg text-gray-600">
            Upload an image to get both a description and extract any text using AI
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="text-lg text-gray-600">
                {isDragActive
                  ? 'Drop your image here...'
                  : 'Drag & drop an image here, or click to select'}
              </p>
              <p className="text-sm text-gray-500">
                Supports PNG, JPG, JPEG, GIF, and WebP images
              </p>
            </div>
          </div>
        </div>

        {image && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={image}
                alt="Uploaded"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center gap-3 text-gray-600 py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-lg">Analyzing image...</span>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{error}</p>
                </div>
              ) : results ? (
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImageLucide className="w-5 h-5 text-indigo-500" />
                      <h2 className="text-xl font-semibold text-gray-900">Image Description</h2>
                    </div>
                    <p className="text-gray-700 text-lg pl-7">{results.description}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <h2 className="text-xl font-semibold text-gray-900">Extracted Text</h2>
                    </div>
                    <p className="text-gray-700 text-lg pl-7 whitespace-pre-wrap">
                      {results.textContent}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;