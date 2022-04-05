import React, {useRef} from 'react';
import './App.css';
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";
import Webcam from "react-webcam";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const runBodySegment = async() => {
    const net = await bodyPix.load();
    // console.log("Bodypix model loaded.")
    setInterval(() => {
      detect(net)
    }, 10);
  };

  const detect = async(net) => {
    // Check data is available
    if (
      typeof webcamRef.current !== "undefined" && 
      webcamRef !== null && 
      webcamRef.current.video.readyState === 4 
    ) {
      // Get video properties
      const video = webcamRef.current.video;
      const videoHeight = video.videoHeight;
      const videoWidth = video.videoWidth;
      // Set video width and height
      webcamRef.current.video.height = videoHeight;
      webcamRef.current.video.width = videoWidth;
      // Set canvas width and height
      canvasRef.current.height = videoHeight;
      canvasRef.current.width = videoWidth;
      // Make detections
      const person = await net.segmentPersonParts(video);
      // console.log(person);
      // Draw detections  
      const coloredPartImage = bodyPix.toColoredPartMask(person);
      bodyPix.drawMask(
        canvasRef.current,
        video,
        coloredPartImage,
        0.7,
        0,
        true
      );
    }
  };

  runBodySegment();

  return (
    <div className="App">
      <header className="App-header">
        <Webcam ref={webcamRef} mirrored="true"
        style = {{
          position:"absolute",
          marginLeft:"auto",
          marginRight:"auto",
          left:0,
          right:0,
          textAlign:"center",
          zIndex:9,
          width:640,
          height:480
        }} />
        <canvas ref={canvasRef}
        style = {{
          position:"absolute",
          marginLeft:"auto",
          marginRight:"auto",
          left:0,
          right:0,
          textAlign:"center",
          zIndex:9,
          width:640,
          height:480
        }} />
      </header>
    </div>
  );
}

export default App;
