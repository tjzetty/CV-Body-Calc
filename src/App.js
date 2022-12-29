import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import { tf } from "@tensorflow/tfjs"; // eslint-disable-line no-unused-vars
import * as bodyPix from "@tensorflow-models/body-pix";
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import "./App.css";
import SwipeableTextMobileStepper from "./Components/Carousel.js";
import BottomScroller from "./Components/BottomScroller.js";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const appState = {
  userData: "input your data",
  prePicture: "taking picture...",
  afterPicture: "change poses",
  showInfo: "results",
};

let state = appState.userData;
let timerCount = 3;
let activeTimer = 1;
let timerInterval = null;
let picCollect = Array(2).fill(null);

function pixelArrayToValues(dataArray) {
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
      height[0] = height[0] < 0 ? y : Math.min(y, height[0]);
      height[1] = height[1] < 0 ? y : Math.max(y, height[1]);
    }
    // grab torso measurement
    if (currentIsBody) {
      torso[0] = torso[0] < 0 ? y : Math.min(y, torso[0]);
      torso[1] = torso[1] < 0 ? y : Math.max(y, torso[1]);
    }
    if (currentIsHead && belowIsBody) {
      // highlight line
      dataArray[i] = 5;
      dataArray[i - 640] = 5;
      // grab neck measurement
      neckMin[0] = neckMin[0] < 0 ? x : Math.min(x, neckMin[0]);
      neckMax[0] = neckMax[0] < 0 ? x : Math.max(x, neckMax[0]);
      neckMin[1] = neckMin[1] < 0 ? x : Math.min(y, neckMin[1]);
      neckMax[1] = neckMax[1] < 0 ? x : Math.max(y, neckMax[1]);
    } else if (currentIsBody && belowIsWaist) {
      // highlight line
      dataArray[i] = 5;
      dataArray[i - 640] = 5;
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
      dataArray[j] = 5;
      dataArray[j - 640] = 5;
      // grab waist measurement
      waistMin[0] = waistMin[0] < 0 ? x : Math.min(x, waistMin[0]);
      waistMax[0] = waistMax[0] < 0 ? x : Math.max(x, waistMax[0]);
      waistMin[1] = waistMin[1] < 0 ? x : Math.min(y, waistMin[1]);
      waistMax[1] = waistMax[1] < 0 ? x : Math.max(y, waistMax[1]);
    }
  }

  let personHeight = height[1] - height[0];
  let neckWidth = neckMax[0] - neckMin[0];
  let waistWidth = waistMax[0] - waistMin[0];
  let hipsWidth = hipsMax[0] - hipsMin[0];
  return [personHeight, neckWidth, waistWidth, hipsWidth];
}

function ellipseCircumference(major, minor) {
  // inputs are diameter, forumla uses radius
  major = 0.5 * major;
  minor = 0.5 * minor;
  return (
    Math.PI *
    (major + minor) *
    ((3 * (major - minor) ** 2) /
      ((major + minor) ** 2 *
        (Math.sqrt((-3 * (major - minor) ** 2) / (major + minor) ** 2 + 4) +
          10)) +
      1)
  );
}

function pxToIn(heightPx, heightIn, measurement) {
  let ratio = heightIn / heightPx;
  return measurement * ratio;
}

function resetTimer(interval, time) {
  clearInterval(interval);
  timerCount = time;
  activeTimer = 1;
}

function countDown() {
  timerCount--;
}

function App() {
  const webcamRef = useRef(null);

  // User inputs gathered using State cause why not
  const [inputInch, setInputInch] = useState(NaN);
  const [inputFeet, setInputFeet] = useState(NaN);
  const [inputHeight, setInputHeight] = useState(0);
  const [inputAge, setInputAge] = useState(NaN);
  const [inputGender, setInputGender] = useState("DEFAULT");
  const [mSelect, setMSelect] = useState("btn btn-outline-primary");
  const [fSelect, setFSelect] = useState("btn btn-outline-primary");
  const [currentState, setCurrentState] = useState("");
  const [open, setOpen] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  // Event handler for app info.
  const onCollapse = (event) => {
    setOpenHelp(false);
    setOpen(!open);
  };
  const onCollapseHelp = (event) => {
    setOpen(false);
    setOpenHelp(!openHelp);
  };
  // Event handlers for user inputs
  const onInchInput = (event) => {
    setInputInch(event.target.value);
    if (isNaN(inputFeet)) setInputHeight(inputInch);
    else setInputHeight(inputInch + inputFeet * 12);
  };
  const onFeetInput = (event) => {
    setInputFeet(event.target.value);
    if (isNaN(inputInch)) setInputHeight(inputFeet * 12);
    else setInputHeight(inputInch + inputFeet * 12);
  };
  const onAgeInput = (event) => {
    setInputAge(event.target.value);
  };
  const onMSelect = (event) => {
    setMSelect("btn btn-primary");
    setFSelect("btn btn-outline-primary");
    setInputGender("M");
  };
  const onFSelect = (event) => {
    setFSelect("btn btn-primary");
    setMSelect("btn btn-outline-primary");
    setInputGender("F");
  };
  const onTryAgain = (event) => {
    state = appState.userData;
    picCollect = Array(2).fill(null);
    setCurrentState(state);
  };

  const runBodySegment = async () => {
    const net = await bodyPix.load();
    // console.log("Bodypix model loaded.")
    if (
      !isNaN(inputInch) &&
      !isNaN(inputFeet) &&
      !isNaN(inputAge) &&
      (inputGender === "M" || inputGender === "F")
    ) {
      setInterval(() => {
        detect(net);
      }, 100);
    } else {
      state = appState.userData;
      setCurrentState(state);
    }
  };
  const canvasRef = useRef(null);

  const detect = async (net) => {
    // Check data is available
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

        let person = null;
        let scores = null;
        let dataArray = null;
        if (state === appState.prePicture) {
          // Make detections
          person = await net.segmentPersonParts(video, {
            flipHorizontal: false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
          });
          scores = person.allPoses[0]["keypoints"]; // Different confidence values
          dataArray = person.data; // Body segmentation on camera
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

        const heading = document.getElementById("show");
        const timerHeading = document.getElementById("timer");
        switch (state) {
          case appState.userData: //checks to see if user data is available
            setCurrentState(state);
            if (
              !isNaN(inputInch) &&
              !isNaN(inputFeet) &&
              !isNaN(inputAge) &&
              (inputGender === "M" || inputGender === "F")
            ) {
              state = appState.prePicture;
              setCurrentState(state);
            }
            break;

          case appState.prePicture: // stage to check for proper posision
            let confidenceLimit = 0.9;
            let confident =
              scores[0]["score"] > confidenceLimit &&
              (scores[5]["score"] > confidenceLimit ||
                scores[6]["score"] > confidenceLimit) &&
              (scores[11]["score"] > confidenceLimit ||
                scores[12]["score"] > confidenceLimit);

            if (confident) {
              // Is timer already ticking?
              if (activeTimer === 1) {
                timerInterval = setInterval(countDown, 1000);
              }
              heading.textContent = timerCount;
              timerHeading.textContent = timerCount;
              activeTimer = 0;
            } else {
              resetTimer(timerInterval, 3);
              heading.textContent = "Pose";
              timerHeading.textContent = "Pose";
            }

            // When timer set to 0 save image
            if (timerCount <= 0) {
              resetTimer(timerInterval, 2);
              if (picCollect[0] == null) {
                picCollect[0] = dataArray;
              } else {
                picCollect[1] = dataArray;
                setCurrentState("Calculating Body Fat Percentage");
                heading.textContent =
                  "Help us improve by anonymously sharing your results at the survey linked in blue at the top of the page.";
              }
              state = appState.afterPicture;
              setCurrentState(state);
            }
            break;

          case appState.afterPicture: // checks to see if done taking all pictures
            if (picCollect[1] != null) {
              state = appState.showInfo;
            } else {
              if (activeTimer === 1) {
                timerInterval = setInterval(countDown, 1000);
                activeTimer = 0;
              }
              if (timerCount <= 0) {
                resetTimer(timerInterval, 3);
                state = appState.prePicture;
                setCurrentState(state);
              } else {
                heading.textContent = "Get Ready for Second Pose";
              }
            }
            break;

          case appState.showInfo:
            // Just some global values to use for calculations
            const majorValues = pixelArrayToValues(picCollect[0]); // [personHeight, neckWidth, waistWidth, hipsWidth]
            const minorValues = pixelArrayToValues(picCollect[1]); // in pixel not inches
            if (!majorValues.includes(0) || !minorValues.includes(0)) {
              console.log(
                "Values returned from pixelArrayToValues: " + majorValues
              );
              console.log(
                "Values returned from pixelArrayToValues: " + minorValues
              );
              // Average the heights, should be the same but this reduces error
              const personHeightMajor = (majorValues[0] + minorValues[0]) / 2;
              const personHeightMinor = (majorValues[0] + minorValues[0]) / 2;
              // Convert measuremnents to inches
              console.log("inputHeight: " + inputHeight);
              const neckMajor = pxToIn(
                personHeightMajor,
                inputHeight,
                majorValues[1]
              );
              const neckMinor = pxToIn(
                personHeightMinor,
                inputHeight,
                minorValues[1]
              );
              const waistMajor = pxToIn(
                personHeightMajor,
                inputHeight,
                majorValues[2]
              );
              const waistMinor = pxToIn(
                personHeightMinor,
                inputHeight,
                minorValues[2]
              );
              const hipsMajor = pxToIn(
                personHeightMajor,
                inputHeight,
                majorValues[3]
              );
              const hipsMinor = pxToIn(
                personHeightMinor,
                inputHeight,
                minorValues[3]
              );
              // Find Circumferences
              const neckCircumference = ellipseCircumference(
                neckMajor,
                neckMinor
              );
              const waistCircumference = ellipseCircumference(
                waistMajor,
                waistMinor
              );
              const hipsCircumference = ellipseCircumference(
                hipsMajor,
                hipsMinor
              );
              // Calculate estimate
              console.log("inputGender: " + inputGender);
              console.log(
                `[inputGender, inputHeight, waistCircumference, hipsCircumference, neckCircumference]: [${inputGender}, ${inputHeight}, ${waistCircumference}, ${hipsCircumference}, ${neckCircumference}]`
              );
              let BFEstimate = NaN;
              if (inputGender === "M") {
                BFEstimate =
                  495 /
                    (1.0324 -
                      0.19077 *
                        Math.log10(
                          waistCircumference * 2.54 - neckCircumference * 2.54
                        ) +
                      0.15456 * Math.log10(inputHeight * 2.54)) -
                  450;
              } else if (inputGender === "F") {
                BFEstimate =
                  495 /
                    (1.29579 -
                      0.35004 *
                        Math.log10(
                          waistCircumference * 2.54 +
                            hipsCircumference * 2.54 -
                            neckCircumference * 2.54
                        ) +
                      0.221 * Math.log10(inputHeight * 2.54)) -
                  450;
              }
              //const BFEstimate = navySealBFormula(inputGender, inputHeight, waistCircumference, hipsCircumference, neckCircumference);
              console.log("Body Fat Estimate: " + BFEstimate.toFixed(2));
              logEvent(analytics, "BFEstimate", {
                Estimate: BFEstimate,
                Gender: inputGender,
                Height: inputHeight,
                Waist_Circ: waistCircumference,
                Hips_Circ: hipsCircumference,
                Neck_Circ: neckCircumference,
              });
              timerHeading.textContent = "";
              setCurrentState(BFEstimate.toFixed(2) + "%");
              if (isNaN(BFEstimate)) console.warn("Body Fat Estimate was bad.");

              // heading.textContent = BFEstimate;
            }
            break;

          default:
          // code block
        }

        // Just some example usages for later :)
        // const elli = ellipseCircumference(parseInt(inputHeight), parseInt(inputWeight));
        // console.warn("major ", inputHeight, ", minor ", inputWeight, ", circ ", elli);
      }
    } catch (e) {
      // Getting rid of those annoying type errors...
      if (e instanceof TypeError) {
      } else throw e;
    }
  };

  runBodySegment();

  return (
    <div className="App" class="container" id="body">
      <style>
        {`
        html, body, Header, HowTo, Inputs {
          background: #424242;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        ::-webkit-scrollbar {
          display: none;
          width: 100px;
        }

        #body {
          margin-top: 5vh;
          margin-left: 10%;
          margin-right: 10%;
        }
        #Header {
          top: 0;
          left: 10%;
          color: #FF0A0A;
          position: fixed;
          width: 100%;
          alight: left;
        }
        #HowTo {
          margin-top: 15vh;
          height: 85vh;

          display: flex;
          gap: 25px;
          flex-direction: column;
          align-items: center;
        }
        #HowTo h1 {
          color: white;
        }
        #Inputs {
          margin-top: 15vh;
          height: 85vh;

          display: flex;
          gap: 25px;
          flex-direction: column;
          align-items: center;
        }
        #Inputs h1, h2 {
          color: white;
        }
        #Inputs h2 {
          width: 40%;
        }
        #pill {
          background-color: black !important;
          padding: 10px 20px 10px 20px;
          border-radius: 500px;
          width: 400px;
          display: flex;
          flex-direction: row;
        }
        #Inputs input {
          height: 50px;
          width: 100px;
        }
        #pill button {
          height: 50px;
          width: 100px;
        }
        #fSelect {
          margin-right: 10px;
        }
        .btn-outline-primary {
          background-color: #969696 !important;
          --bs-btn-border-color: #969696 !important;
        }
        #Inputs BottomScroller {
          display: flex;
	        align-items: flex-end;
        }
        #Measuring {

        }
        `}
      </style>
      <div id="Header">
        <h1>Body Fat Estimator</h1>
      </div>
      <div id="HowTo">
        <h1>How to use :)</h1>
        <SwipeableTextMobileStepper />
        <BottomScroller />
      </div>
      <div id="Inputs">
        <h1>First we need some data...</h1>
        <div id="pill">
          <h2>Height:</h2>
          <input
            type="number"
            placeholder="? ft"
            id="inputFeet"
            name="inputFeet"
            onChange={onFeetInput}
            value={inputFeet}
            style={{ marginRight: "10px" }}
          />
          <input
            type="number"
            placeholder="? in"
            id="inputInch"
            name="inputInch"
            onChange={onInchInput}
            value={inputInch}
          />
        </div>
        <div id="pill">
          <h2>Age:</h2>
          <input
            type="number"
            placeholder="? yrs"
            id="inputAge"
            name="inputAge"
            onChange={onAgeInput}
            value={inputAge}
          />
        </div>
        <div id="pill">
          <h2>Gender:</h2>
          <button
            id="fSelect"
            name="fSelect"
            type="button"
            class={fSelect}
            onClick={onFSelect}
          >
            F
          </button>
          <button
            id="mSelect"
            name="mSelect"
            type="button"
            class={mSelect}
            onClick={onMSelect}
          >
            M
          </button>
        </div>
        <BottomScroller />
      </div>
      <div id="Measuring">
        <div
          id="bodyPix"
          style={{ background: "#E4E6EB", "margin-top": "20px" }}
        >
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
              "border-radius": "6px",
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
              "border-radius": "6px",
            }}
          />
        </div>
      </div>
      <div id="Results"></div>
    </div>
  );
}

export default App;
