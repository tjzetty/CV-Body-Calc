import React, { useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";

import "./App.css";
import { conv2d, image, model, Tensor, tensor6d } from "@tensorflow/tfjs";

let timerCount = 3;
let activeTimer = 1;
let screenShot = null;
const timerInterval = null;

function App() {
  let imageSave = null;
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
      imageSave = canvasRef.current.toDataURL("image/png");
      // Make detections
      const person = await net.segmentPersonParts(video, {
        flipHorizontal: false,
        internalResolution: "medium",
        segmentationThreshold: 0.7,
      });

      //console.log(person);

      let bodyParts = person.allPoses; // Different confidence values
      //console.log(person.allPoses);
      

      let scores = bodyParts[0]['keypoints'];
      let confidence = 0.90;
      if(scores[0]['score'] > confidence && scores[1]['score']  > confidence && scores[12]['score']  > confidence 
        && scores[13]['score']  > confidence && scores[14]['score']  > confidence && scores[16]['score']  > confidence)//check confidences
        {
          if(activeTimer == 1)//boolean to check if timer already started ticking
          {
            timerInterval = setInterval(countDown,1000);
          }
            console.log(timerCount);
            activeTimer = 0;
        }
        else
        {
          timerCount = 3;
          activeTimer = 1;
          console.log(timerCount);
        }
        
        /* This is test code for future overlay
        var contextvar = canvasRef.current.getContext("2d");
        var imageObj = new Image();
        imageObj.onload=function(){
          contextvar.drawImage(imageObj,10,10);
        }
        imageObj.src = "http://wannabevc.files.wordpress.com/2010/09/im-cool.jpg";
        */

      if(timerCount <= 0)//when timer set to 0 save image
      {
        screenShot = imageSave;
        clearInterval(timerInterval);
        timerCount = 3;
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
