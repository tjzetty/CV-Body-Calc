import React, { useRef } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";

import "./App.css";

let timerCount = 3;
let activeTimer = 1;
let screenShot = null;
let timerInterval = null;


function countDown() {
  timerCount--;
}

function App() {
  let imageSave = null;
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  let height;
  let neckWidth;
  let waistWidth;
  let hipsWidth;

  const runBodySegment = async () => {
    const net = await bodyPix.load();
    // console.log("Bodypix model loaded.")
    setInterval(() => {
      detect(net);
    }, 0);
  };

  const detect = async (net) => {
    try {
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
          segmentationThreshold: 0.9,
        });
        // let scores = person.allPoses[0]['keypoints']; // Different confidence values
        let dataArray = person.data; // Body segmentation on camera
        // let confidenceLimit = 0.90;
        // let confident = scores[0]['score']   > confidenceLimit && 
        //                 scores[1]['score']   > confidenceLimit && 
        //                 scores[12]['score']  > confidenceLimit && 
        //                 scores[13]['score']  > confidenceLimit && 
        //                 scores[14]['score']  > confidenceLimit && 
        //                 scores[16]['score']  > confidenceLimit;

        if(true) {
            // Is timer already ticking?
            if(activeTimer === 1) {
              timerInterval = setInterval(countDown,1000);
            }
            console.log(timerCount);
            activeTimer = 0;
        } else {
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
        
        // When timer set to 0 save image
        if(timerCount <= 0)
        {
          screenShot = imageSave;
          clearInterval(timerInterval);
          timerCount = 3;
        }


        // Measurements (coordinates)
        let height = [-1, -1];
        let torso = [-1, -1]; // Shoulders, hips - vertical distance measurement
        let neckMin = [-1, -1];
        let neckMax = [-1, -1];
        let waistMin = [-1, -1];
        let waistMax = [-1, -1];
        let hipsMin = [-1, -1];
        let hipsMax = [-1, -1];

        for (var i = 0; i < dataArray.length - 640; i++) {
          let current = dataArray[i];
          let next = dataArray[i + 640];
          let x = i % 640;
          let y = Math.floor(i / 640);

          let currentIsPerson = current !== -1;
          let currentIsHead = current === 0 || current === 1;
          let currentIsBody = current === 13 || current === 12;
          let belowIsBody = next === 13 || next === 12;
          let belowIsWaist = next === 14 || next === 16;

          if (currentIsPerson) {
            height[0] = height[0] > 0 ? y : Math.min(y, height[0]);
            height[1] = height[1] > 0 ? y : Math.max(y, height[1]);
          }
          // grab torso measurement
          if (currentIsBody) {
            torso[0] = torso[0] > 0 ? y : Math.min(y, torso[0]);
            torso[1] = torso[1] > 0 ? y : Math.max(y, torso[1]);
          }
          if (currentIsHead && belowIsBody) {
            // highlight line
            person.data[i] = 5;
            person.data[i - 640] = 5;
            // grab neck measurement
            neckMin[0] = neckMin[0] < 0 ? x : Math.min(x, neckMin[0]);
            neckMax[0] = neckMax[0] < 0 ? x : Math.max(x, neckMax[0]);
            neckMin[1] = neckMin[1] < 0 ? x : Math.min(y, neckMin[1]);
            neckMax[1] = neckMax[1] < 0 ? x : Math.max(y, neckMax[1]);
          } else if (currentIsBody && belowIsWaist) {
            // highlight line
            person.data[i] = 5;
            person.data[i - 640] = 5;
            // grab hips measurement
            hipsMin[0] = hipsMin[0] < 0 ? x : Math.min(x, hipsMin[0]);
            hipsMax[0] = hipsMax[0] < 0 ? x : Math.max(x, hipsMax[0]);
            hipsMin[1] = hipsMin[1] < 0 ? x : Math.min(y, hipsMin[1]);
            hipsMax[1] = hipsMax[1] < 0 ? x : Math.max(y, hipsMax[1]);
          }
        }
        // Calculate Waist based at 50% height of torso, that is go down 50% from the shoulders
        // y = 0 is at top so waist - Shoulders
        // calculate y from there, then can find array range at that y index
        let waistHeight = torso[0] + 0.5 * (torso[1] - torso[0]);
        // Transform to match y level in flat pixel array
        waistHeight = waistHeight * 640;
        for (var j = waistHeight; j < waistHeight + 640; j++) {
          let current = dataArray[j];
          let x = j % 640;
          let y = Math.floor(j / 640);
          let currentIsBody = current === 13 || current === 12;

          if (currentIsBody) {
            // highlight line
            person.data[j] = 5;
            person.data[j - 640] = 5;
            // grab waist measurement
            waistMin[0] = waistMin[0] < 0 ? x : Math.min(x, waistMin[0]);
            waistMax[0] = waistMax[0] < 0 ? x : Math.max(x, waistMax[0]);
            waistMin[1] = waistMin[1] < 0 ? x : Math.min(y, waistMin[1]);
            waistMax[1] = waistMax[1] < 0 ? x : Math.max(y, waistMax[1]);
          }
        }

        // Double checking measurements make sense as we move...
        height = height[1] - height[0];
        neckWidth = neckMax[0] - neckMin[0];
        hipsWidth = hipsMax[0] - hipsMin[0];
        waistWidth = waistMax[0] - waistMin[0];
        console.log("Height: ", height);
        console.log("Neck width: ", neckWidth);
        console.log("Hips width: ", hipsWidth);
        console.log("Waist width: ", waistWidth);
        console.log("--------------------------");

        // Draw detections
        const coloredPartImage = bodyPix.toColoredPartMask(person);
        bodyPix.drawMask(
          canvasRef.current,
          video,
          coloredPartImage,
          0.5,
          0,
          true
        );
      }
    } catch (e) {
      // Getting rid of those annoying type errors...
      if (e instanceof TypeError) {
      } else throw e;
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

export default App;
