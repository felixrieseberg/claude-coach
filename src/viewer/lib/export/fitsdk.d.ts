declare module "@garmin/fitsdk" {
  export class Encoder {
    onMesg(mesgNum: number, data: Record<string, unknown>): void;
    close(): Uint8Array;
  }

  export const Profile: {
    MesgNum: {
      FILE_ID: number;
      WORKOUT: number;
      WORKOUT_STEP: number;
    };
  };
}
