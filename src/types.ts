// src/types.ts
export interface CurrentlyPlaying {
	is_playing: boolean; // Add this line
	item: {
		name: string;
		artists: {
			name: string;
		}[];
		album: {
			name: string;
			images: {
				url: string;
			}[];
		};
	};
}