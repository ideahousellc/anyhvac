import { Composition } from "remotion";

import defaultVideo from "../campaigns/002-airflow-static-pressure/video.json";
import prototypeVideo from "../campaigns/002-airflow-static-pressure/video-prototype.json";
import ductVideo from "../campaigns/003-why-duct-size-matters/video.json";
import type { VideoInput } from "../schema";
import { AnyHVACTechnicalShort } from "./compositions/AnyHVACTechnicalShort";
import { PressureFieldAirflowStream } from "./compositions/PressureFieldAirflowStream";
import { DuctSizeMatters, type DuctSizeVideoInput } from "./compositions/DuctSizeMatters";

const input = defaultVideo as VideoInput;
const prototype = prototypeVideo as VideoInput;
const duct = ductVideo as DuctSizeVideoInput;

export function RemotionRoot() {
  return (
    <>
    <Composition
      id="AnyHVAC-Pressure-Field"
      component={PressureFieldAirflowStream}
      width={input.width}
      height={input.height}
      fps={input.fps}
      durationInFrames={input.durationSeconds * input.fps}
      defaultProps={input}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationSeconds * props.fps,
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
    <Composition
      id="AnyHVAC-Duct-Size-Matters"
      component={DuctSizeMatters}
      width={duct.width}
      height={duct.height}
      fps={duct.fps}
      durationInFrames={duct.durationSeconds * duct.fps}
      defaultProps={duct}
    />
    <Composition
      id="AnyHVAC-Technical-Short-Prototype"
      component={AnyHVACTechnicalShort}
      width={prototype.width}
      height={prototype.height}
      fps={prototype.fps}
      durationInFrames={prototype.durationSeconds * prototype.fps}
      defaultProps={prototype}
    />
    </>
  );
}
