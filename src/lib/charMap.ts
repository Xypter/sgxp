// Character map type definition
export interface CharacterData {
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
}

export interface CharacterMap {
  [key: string]: CharacterData;
}

// Character map definitions
export const charMap: CharacterMap = {
  // Letters A-Z (starting at y: 1, custom widths for some letters, default height: 5)
  'A': { x: -1, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'B': { x: -7, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'C': { x: -13, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'D': { x: -19, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'E': { x: -25, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'F': { x: -31, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'G': { x: -37, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'H': { x: -43, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'I': { x: -49, y: -1, width: 1, height: 5, offsetX: 0, offsetY: 0 }, // 1x5
  'J': { x: -53, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'K': { x: -59, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'L': { x: -65, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'M': { x: -71, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 }, // 5x5
  'N': { x: -79, y: -1, width: 4, height: 5, offsetX: 0, offsetY: 0 }, // 4x5
  'O': { x: -86, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'P': { x: -92, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'Q': { x: -98, y: -1, width: 4, height: 5, offsetX: 0, offsetY: 0 }, // 4x5
  'R': { x: -105, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'S': { x: -111, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'T': { x: -117, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'U': { x: -123, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'V': { x: -129, y: -1, width: 4, height: 5, offsetX: 0, offsetY: 0 }, // 4x5
  'W': { x: -136, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 }, // 5x5
  'X': { x: -144, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'Y': { x: -150, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  'Z': { x: -157, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  
  // Numbers 1-0 (all 3x5)
  '1': { x: -163, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '2': { x: -169, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '3': { x: -175, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '4': { x: -181, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '5': { x: -187, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '6': { x: -193, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '7': { x: -199, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '8': { x: -205, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '9': { x: -211, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '0': { x: -217, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  
  // Special characters with fine-tuned positioning
  '?': { x: -222, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 },
  '!': { x: -229, y: -1, width: 1, height: 5, offsetX: 0, offsetY: 0 },
  '.': { x: -233, y: -1, width: 1, height: 5, offsetX: 0, offsetY: 0 },
  ',': { x: -236, y: -2, width: 2, height: 2, offsetX: 0, offsetY: 0 },
  '"': { x: -240, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  "'": { x: -240, y: -1, width: 1, height: 5, offsetX: 0, offsetY: 0 },
  '-': { x: -245, y: -1, width: 2, height: 5, offsetX: 0, offsetY: 0 },
  '_': { x: -391, y: -1, width: 5, height: 1, offsetX: 0, offsetY: 0 },
  '&': { x: -251, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 },
  '*': { x: -259, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '@': { x: -265, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 },
  '#': { x: -273, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 },
  '$': { x: -281, y: 0, width: 3, height: 7, offsetX: 0, offsetY: 1 },
  '/': { x: -286, y: 0, width: 3, height: 6, offsetX: 0, offsetY: 0 },
  '%': { x: -291, y: 0, width: 5, height: 6, offsetX: 0, offsetY: 0 },
  '^': { x: -299, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  
  // Brackets with positioning adjustments
  '(': { x: -305, y: 0, width: 3, height: 7, offsetX: 1, offsetY: 1 },
  ')': { x: -310, y: 0, width: 2, height: 7, offsetX: 0, offsetY: 1 },
  '[': { x: -328, y: 0, width: 2, height: 7, offsetX: 2, offsetY: 1 },
  ']': { x: -333, y: 0, width: 2, height: 7, offsetX: 0, offsetY: 1 },
  '{': { x: -338, y: 0, width: 3, height: 7, offsetX: 0, offsetY: 1 },
  '}': { x: -344, y: 0, width: 3, height: 7, offsetX: 0, offsetY: 1 },
  
  '+': { x: -315, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '=': { x: -321, y: -1, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '|': { x: -350, y: 0, width: 1, height: 7, offsetX: 0, offsetY: 0 },
  '\\': { x: -354, y: 0, width: 3, height: 6, offsetX: 0, offsetY: 0 },
  '<': { x: -360, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  '>': { x: -366, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
  ':': { x: -372, y: -1, width: 1, height: 5, offsetX: 0, offsetY: 0 },
  ';': { x: -375, y: -1, width: 2, height: 6, offsetX: 0, offsetY: 1 },
  '~': { x: -380, y: -1, width: 5, height: 5, offsetX: 0, offsetY: 0 },
  '`': { x: -388, y: -1, width: 2, height: 2, offsetX: 0, offsetY: -3 },
  ' ': { x: -398, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 },
};

// Secondary number set - for special use cases
export const altNumberMap: CharacterMap = {
  '1': { x: -1, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '2': { x: -7, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '3': { x: -13, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '4': { x: -19, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '5': { x: -25, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '6': { x: -31, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '7': { x: -37, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '8': { x: -43, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '9': { x: -49, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  '0': { x: -53, y: -8, width: 4, height: 5, offsetX: 0, offsetY: 0 },
  ' ': { x: -398, y: -1, width: 3, height: 5, offsetX: 0, offsetY: 0 }, // Space remains the same
};