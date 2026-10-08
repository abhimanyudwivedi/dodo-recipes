import React from "react";
import { Composition } from "remotion";
import { Ad, AdProps } from "./Ad";
import { layout, withHook } from "./timing.mjs";
import example from "../ads/example.json";

// The render script passes the real ad as input props; the example is what the studio shows.
export const Root: React.FC = () => (
  <Composition
    id="Ad"
    component={Ad}
    defaultProps={{ ad: withHook(example, example.hooks[0].id) } as AdProps}
    calculateMetadata={({ props }) => {
      const a = (props as AdProps).ad;
      return { durationInFrames: layout(a).totalFrames, fps: a.fps, width: a.width, height: a.height };
    }}
  />
);
