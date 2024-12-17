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
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      const response = await axios.post(
        "https://separation-expanding-incidents-had.trycloudflare.com/upload_frame/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResponse(JSON.stringify(response.data));
    } catch (error) {
      console.error("Error sending frame:", error);
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
      }, 500);

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

      {response && (
        <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-md shadow w-full max-w-4xl">
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default CameraStream;
