import { Composition } from "remotion";
import { SmartCardPromo } from "./SmartCardPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SmartCardPromo"
        component={SmartCardPromo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
