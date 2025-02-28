import React, { useState, useRef } from 'react';

const SteganographyTool = () => {
  const [mode, setMode] = useState('encode'); // 'encode' or 'decode'
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [extractedMessage, setExtractedMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [outputImage, setOutputImage] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Convert text to binary
  const textToBinary = (text) => {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i).toString(2).padStart(8, '0');
      binary += charCode;
    }
    // Add terminator sequence (8 zeros) to mark the end of the message
    binary += '00000000';
    return binary;
  };

  // Convert binary to text
  const binaryToText = (binary) => {
    let text = '';
    for (let i = 0; i < binary.length; i += 8) {
      const byte = binary.substr(i, 8);
      if (byte === '00000000') break; // Stop at terminator sequence
      const charCode = parseInt(byte, 2);
      text += String.fromCharCode(charCode);
    }
    return text;
  };

  // Hide message in image
  const hideMessage = (image) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw the image on the canvas
    ctx.drawImage(image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert message to binary
    const binaryMessage = textToBinary(message);
    
    // Check if the message is too long for the image
    if (binaryMessage.length > data.length / 4 * 3) {
      setStatus('Error: Message is too long for this image');
      return;
    }
    
    // Embed the binary message in the LSBs of the image data
    let binaryIndex = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      // We use only R, G, B channels (skip Alpha)
      for (let j = 0; j < 3; j++) {
        if (binaryIndex < binaryMessage.length) {
          // Clear the LSB and set it to the message bit
          data[i + j] = (data[i + j] & 0xFE) | parseInt(binaryMessage[binaryIndex], 2);
          binaryIndex++;
        } else {
          break;
        }
      }
      
      if (binaryIndex >= binaryMessage.length) break;
    }
    
    // Put the modified image data back on the canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert canvas to data URL for download
    setOutputImage(canvas.toDataURL('image/png'));
    setStatus('Message hidden successfully! You can now download the image.');
  };

  // Extract message from image
  const extractMessage = (image) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match the image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw the image on the canvas
    ctx.drawImage(image, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Extract the binary message from the LSBs
    let binaryMessage = '';
    let byteCount = 0;
    let currentByte = '';
    
    for (let i = 0; i < data.length; i += 4) {
      // We use only R, G, B channels (skip Alpha)
      for (let j = 0; j < 3; j++) {
        // Get the LSB
        const bit = data[i + j] & 1;
        currentByte += bit;
        
        if (currentByte.length === 8) {
          // Check for terminator sequence
          if (currentByte === '00000000') {
            // Message is complete
            setExtractedMessage(binaryToText(binaryMessage));
            setStatus('Message extracted successfully!');
            return;
          }
          
          binaryMessage += currentByte;
          currentByte = '';
          byteCount++;
          
          // Avoid processing the entire image if no message is found
          if (byteCount > 10000) {
            setStatus('No hidden message found or message is corrupted.');
            return;
          }
        }
      }
    }
    
    // If we get here, we didn't find the terminator sequence
    setStatus('No hidden message found or message is corrupted.');
  };

  // Handle file upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImagePreview(event.target.result);
        if (mode === 'encode') {
          setStatus('Image loaded. Enter your message and click "Hide Message".');
        } else {
          extractMessage(img);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imagePreview) {
      setStatus('Please upload an image first.');
      return;
    }
    
    if (mode === 'encode') {
      if (!message) {
        setStatus('Please enter a message to hide.');
        return;
      }
      
      const img = new Image();
      img.onload = () => hideMessage(img);
      img.src = imagePreview;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Image Steganography Tool</h1>
      
      <div className="flex space-x-4 mb-6">
        <button
          className={`flex-1 py-2 rounded-md ${mode === 'encode' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setMode('encode')}
        >
          Hide Message
        </button>
        <button
          className={`flex-1 py-2 rounded-md ${mode === 'decode' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setMode('decode');
            setMessage('');
            setOutputImage(null);
          }}
        >
          Extract Message
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Upload Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        {mode === 'encode' && (
          <div>
            <label className="block mb-2 font-medium">Message to Hide:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border rounded-md h-24"
              placeholder="Enter your secret message here..."
            />
          </div>
        )}
        
        {mode === 'encode' && (
          <button
            type="submit"
            className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Hide Message
          </button>
        )}
      </form>
      
      {status && (
        <div className={`mt-4 p-3 rounded-md ${status.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {status}
        </div>
      )}
      
      <div className="flex flex-wrap mt-6 gap-4">
        {imagePreview && (
          <div className="w-full md:w-5/12">
            <h3 className="font-medium mb-2">Original Image:</h3>
            <img src={imagePreview} alt="Original" className="max-w-full h-auto border rounded-md" />
          </div>
        )}
        
        {outputImage && mode === 'encode' && (
          <div className="w-full md:w-5/12">
            <h3 className="font-medium mb-2">Image with Hidden Message:</h3>
            <img src={outputImage} alt="With hidden message" className="max-w-full h-auto border rounded-md" />
            <a
              href={outputImage}
              download="stego_image.png"
              className="block mt-2 text-center py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download Image
            </a>
          </div>
        )}
      </div>
      
      {mode === 'decode' && extractedMessage && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Extracted Message:</h3>
          <div className="p-3 bg-gray-100 rounded-md border">
            {extractedMessage}
          </div>
        </div>
      )}
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default SteganographyTool;
