"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";

const CameraStream = () => {
  const [streaming, setStreaming] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [response, setResponse] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<
    string | undefined
  >();
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const [threshImage, setThreshImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // parameters
  const [threshold_factor, setThresholdFactor] = useState(25);
  const [motion_factor, setMotionFactor] = useState(1000);
  const [intervel, setIntervel] = useState(100);
  const [endpoint, setEndpoint] = useState("http://192.168.31.82:8000");

  const startVideoStream = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  useEffect(() => {
    const requestPermissionAndGetDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Camera permissions denied:", error);
      }
    };

    requestPermissionAndGetDevices();
  }, []);

  const sendFrame = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const res = await axios.post(
        `${endpoint}/upload_frame/?threshold_factor=${threshold_factor}&motion_factor=${motion_factor}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResponse(JSON.stringify(res.data.message));
      if (res.data.processed_frame) {
        setProcessedFrame(res.data.processed_frame);
      }
      if (res.data.thresh_image) {
        setThreshImage(res.data.thresh_image);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.error("Network error:", error);
      } else {
        console.error("Error sending frame:", error);
      }
    }
  };

  const startStreaming = () => {
    if (!streaming && selectedDeviceId) {
      setStreaming(true);

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      const id = setInterval(() => {
        if (videoRef.current && context) {
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) sendFrame(blob);
          }, "image/jpeg");
        }
      }, intervel);

      setIntervalId(id);
    }
  };

  const stopStreaming = () => {
    if (streaming) {
      setStreaming(false);
      if (intervalId) clearInterval(intervalId);
    }
  };

  useEffect(() => {
    if (selectedDeviceId) {
      startVideoStream(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Camera Stream
      </h1>

      {devices.length > 0 && (
        <div className="mb-4 w-full max-w-md">
          <label
            htmlFor="camera-select"
            className="block text-gray-700 text-sm font-medium mb-2"
          >
            Choose Camera:
          </label>
          <select
            id="camera-select"
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            value={selectedDeviceId}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full max-w-4xl border border-gray-300 rounded-lg shadow-lg"
      />

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button
          onClick={startStreaming}
          disabled={streaming}
          className={`px-6 py-2 font-medium text-white rounded-md shadow-md transition-all duration-300 ${
            streaming
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          Start Streaming
        </button>
        <button
          onClick={stopStreaming}
          disabled={!streaming}
          className={`px-6 py-2 font-medium text-white rounded-md shadow-md transition-all duration-300 ${
            !streaming
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          Stop Streaming
        </button>
      </div>

      <div className="mt-6 w-full max-w-md">
        <label
          htmlFor="threshold-factor"
          className="block text-gray-700 text-sm font-medium mb-2"
        >
          Threshold Factor: {threshold_factor}
        </label>
        <input
          id="threshold-factor"
          type="range"
          min="0"
          max="100"
          value={threshold_factor}
          onChange={(e) => setThresholdFactor(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="mt-6 w-full max-w-md">
        <label
          htmlFor="motion-factor"
          className="block text-gray-700 text-sm font-medium mb-2"
        >
          Motion Factor: {motion_factor}
        </label>
        <input
          id="motion-factor"
          type="range"
          min="0"
          max="5000"
          value={motion_factor}
          onChange={(e) => setMotionFactor(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="mt-6 w-full max-w-md">
        <label
          htmlFor="Intervel"
          className="block text-gray-700 text-sm font-medium mb-2"
        >
          intervel between frames: {intervel}
        </label>
        <input
          id="interval"
          type="range"
          min="0"
          max="1000"
          value={intervel}
          onChange={(e) => setIntervel(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {response && (
        <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-md shadow w-full max-w-4xl">
          <p>{response}</p>
        </div>
      )}
      <div className="flex flex-row items-center justify-center mt-6">
        {processedFrame && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Processed Frame
            </h2>
            <img
              src={`data:image/jpeg;base64,${processedFrame}`}
              alt="Processed Frame"
              className="w-full max-w-4xl border border-gray-300 rounded-lg shadow-lg"
            />
          </div>
        )}

        {threshImage && (
          <div className="mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Threshold Image
            </h2>
            <img
              src={`data:image/jpeg;base64,${threshImage}`}
              alt="Threshold Image"
              className="w-full max-w-4xl border border-gray-300 rounded-lg shadow-lg"
            />
          </div>
        )}
      </div>
      <input
        type="text"
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
        className="mt-6 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
};

export default CameraStream;
