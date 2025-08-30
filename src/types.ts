// src/types.ts

export interface CurrentlyPlaying {
	device: {
		volume_percent: number;
	};
	is_playing: boolean;
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
