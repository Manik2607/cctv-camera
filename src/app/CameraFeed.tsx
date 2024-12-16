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

  // Start video stream with the selected webcam
  const startVideoStream = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream; // Set the stream as the source for the video element
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  // Get available video devices (cameras)
  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId); // Default to the first device
      }
    };

    getDevices();
  }, []);

  // Capture frames and send them to the server using axios
  const sendFrame = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const response = await axios.post(
        "http://localhost:8000/upload_frame/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      //   console.log(response.data);
      setResponse(JSON.stringify(response.data));
    } catch (error) {
      console.error("Error sending frame:", error);
    }
  };

  // Start streaming frames to the server
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
      }, 500); // Send a frame every 100ms

      setIntervalId(id);
    }
  };

  // Stop streaming frames to the server
  const stopStreaming = () => {
    if (streaming) {
      setStreaming(false);
      if (intervalId) clearInterval(intervalId);
    }
  };

  // Start the video stream when the selected camera changes
  useEffect(() => {
    if (selectedDeviceId) {
      startVideoStream(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  return (
    <div>
      <h1>Camera Stream</h1>

      {/* Camera selection dropdown */}
      {devices.length > 0 && (
        <div>
          <label htmlFor="camera-select">Choose Camera: </label>
          <select
            id="camera-select"
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            value={selectedDeviceId}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        width="80%"
        style={{ border: "1px solid #ccc" }}
      />

      <div id="controls" style={{ marginTop: "20px" }}>
        <button
          onClick={startStreaming}
          disabled={streaming}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          Start Streaming
        </button>
        <button
          onClick={stopStreaming}
          disabled={!streaming}
          style={{ padding: "10px 20px", fontSize: "16px" }}
        >
          Stop Streaming
        </button>
        {response && <p>{response}</p>}
      </div>
    </div>
  );
};

export default CameraStream;
