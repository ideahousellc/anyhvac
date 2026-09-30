import { Composition } from "remotion";

import defaultVideo from "../campaigns/002-airflow-static-pressure/video.json";
import type { VideoInput } from "../schema";
import { AnyHVACTechnicalShort } from "./compositions/AnyHVACTechnicalShort";

const input = defaultVideo as VideoInput;

export function RemotionRoot() {
  return (
    <Composition
      id="AnyHVAC-Technical-Short"
      component={AnyHVACTechnicalShort}
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
  );
}
