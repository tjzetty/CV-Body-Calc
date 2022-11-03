import React, { useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";

import "./App.css";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const runBodySegment = async () => {
    const net = await bodyPix.load();
    // console.log("Bodypix model loaded.")
    setInterval(() => {
      detect(net);
    }, 0);
  };

  const detect = async (net) => {
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
      const person = await net.segmentPersonParts(video, {
        flipHorizontal: false,
        internalResolution: "medium",
        segmentationThreshold: 0.7,
      });
      console.log(person);
      let bodyParts = person.allPoses; // Different confidence values
      let dataArray = person.data; // Body segmentation on camera

      // Measurements
      let torso  = [-1, -1]; // Shoulders, hips - vertical distance measurement
      let neckMin = [-1, -1];
      let neckMax = [-1, -1];
      let waistMin = [-1, -1];
      let waistMax = [-1, -1];
      let hipsMin = [-1, -1];
      let hipsMax = [-1, -1];

      console.log("data: " + typeof(dataArray) + " , data[]: " + dataArray[0] + ", data[][]" + typeof(dataArray[0][0]));
      for (var i = 0; i < dataArray.length - 640; i++) {
        let current = dataArray[i];
        let next = dataArray[i +640];
        let x = i % 640;
        let y = Math.floor(i / 640);

        let currentIsHead = current === 0 || current === 1;
        let currentIsBody = current === 13 || current === 12;
        let belowIsBody = next === 13 || next === 12;
        let belowIsWaist = next === 15 || next === 16; // TODO: THESE WILL BE CHANGED

        if (currentIsBody) {
          torso[0] = (torso[0] > 0) ? y : Math.max(y, torso[0]);
        }
        if (currentIsHead && belowIsBody) {
          neckMin[0] = (neckMin[0] < 0) ? x : Math.min(x, neckMin[0]);
          neckMax[0] = (neckMax[0] < 0) ? x : Math.max(x, neckMax[0]);
          neckMin[1] = (neckMin[1] < 0) ? x : Math.min(y, neckMin[1]);
          neckMax[1] = (neckMax[1] < 0) ? x : Math.max(y, neckMax[1]);
          // console.log("x: " + x + ", y: " + y);
        } else if (currentIsBody && belowIsWaist) {
          // grab torso measurement
          torso[1] = (torso[1] > 0) ? y : Math.max(y, torso[1]);
          // grab hips measurement
          person.data[i] = -1
          person.data[i-640] = -1
          hipsMin[0] = (hipsMin[0] < 0) ? x : Math.min(x, hipsMin[0]);
          hipsMax[0] = (hipsMax[0] < 0) ? x : Math.max(x, hipsMax[0]);
          hipsMin[1] = (hipsMin[1] < 0) ? x : Math.min(y, hipsMin[1]);
          hipsMax[1] = (hipsMax[1] < 0) ? x : Math.max(y, hipsMax[1]);
        }
      }
      // Calculate Waist based at 25% height of torso, that is go down 75% from the shoulders
      // y = 0 is at top so waist - Shoulders
      // calculate y from there, then can find array range at that y index
      let waistHeight = torso[0] + 0.75 * (torso[1] - torso[0]);

      // Double checking widths make sense as we move...
      let neckWidth = neckMax[0] - neckMin[0];
      let waistWidth = waistMax[0] - waistMin[0];
      let hipsWidth = hipsMax[0] - hipsMin[0];
      console.log("Neck width: ", neckWidth);
      console.log("Hips width: ", hipsWidth);

      // console.log("MIN: ", min, "MAX: ", max);
      console.log([...new Set(dataArray)]); // Different numbers for different body parts.


      // Draw detections
      const coloredPartImage = bodyPix.toColoredPartMask(person);
      bodyPix.drawMask(
        canvasRef.current,
        video,
        coloredPartImage,
        .5,
        0,
        true
      );

      // Trying to draw line of prediction but not working 🙃
      // const ctx = canvasRef.current.getContext("2d");
      // ctx.save();
      // ctx.strokeStyle = 'red';
      // ctx.lineWidth = 3;
      // ctx.beginPath();
      // console.log(neckMin[0], neckMin[1]);
      // ctx.moveTo(640 - neckMin[0], neckMin[1]);
      // ctx.lineTo(640 - neckMax[0], neckMax[1]);
      // ctx.stroke();
    }
  };

  runBodySegment();

  return (
    <div className="App">
      <header className="App-header">
        {/* <h2>Neck Width: {neckWidth}</h2>
        <h2>Waist Width: {waistWidth}</h2>
        <h2>Hips Width: {hipsWidth}</h2> */}
        <Webcam
          ref={webcamRef}
          mirrored="true"
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />
      </header>
    </div>
  );
}

export default App;
