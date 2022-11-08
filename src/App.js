import React, { useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";

import "./App.css";
import { conv2d, image, model, Tensor, tensor6d } from "@tensorflow/tfjs";

let timerCount = 3;
let holdStill = 1;
function App() {
  let imageHolder = null;
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

      //console.log(person);

      let bodyParts = person.allPoses; // Different confidence values
      //console.log(person.allPoses);
      let total = 0;
      for(let count = 0; count < bodyParts.length; count++)//gets average of different scores 
      {
          let hold = bodyParts[count]['keypoints'];
          let tempTot = 0;
          for(let count2 = 0; count2 < 17; count2++)//averages the keypoints
          {
              if(count2 == 0 || count2 == 1 || count2 == 2 || count2 == 5 || count2 == 6 || count2 > 10)
              {
                tempTot += hold[count2]["score"];
              }
          }
          tempTot = tempTot/11;
          total += tempTot;
      }

      total = total/bodyParts.length;

      if(total > 0.9 && holdStill == 1)//checks if confidence is above %90
      {
        setInterval(countDown,1000);
        console.log(timerCount);
        holdStill = 0;
      }
      else
      {
        //holdStill = 1;
        timerCount = 3;
      }

      if(timerCount <= 0)//when timer set to 0 save image
      {
        imageHolder = await net.estimatePersonSegmentation(video, 16, 0.7); //save image I think
        console.log(imageHolder);
      }
      //console.log(total/bodyParts.length);

      let dataArray = person.data; // Body segmentation on camera
      //console.log([...new Set(dataArray)]); // Different numbers for different body parts.


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
    }
  };

  runBodySegment();

  return (
    <div className="App">
      <header className="App-header">
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

function countDown()
{
  timerCount--;
}
export default App;
