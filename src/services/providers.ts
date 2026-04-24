import { v4 as uuidv4 } from "uuid";
import { TransportMode } from "../types";
import { FareEngine } from "./fare_engine";
import { Connector, NYConnector, UberConnector, OlaConnector, TransitConnector } from "./connectors";

export interface RideBid {
  provider: string;
  mode: TransportMode;
  price: number;
  type: string;
  eta: number; // in minutes
  waitingTime: number;
  deepLink: string;
  isONDC?: boolean;
  transactionId?: string;
}

export interface WeatherContext {
  isRaining: boolean;
  temperature?: number;
}

export class ProviderService {
  private timeout: number = 8000; // Increased timeout for multiple connectors
  private connectors: Connector[] = [
    new NYConnector(),
    new UberConnector(),
    new OlaConnector(),
    new TransitConnector()
  ];

  /**
   * INTEGRATION NOTE: This service follows the nammayatri/ny-connectors architecture.
   * It fans out requests to various mobility provider "connectors" to fetch real-time fares.
   */
  private ONDC_GATEWAY_URL = process.env.ONDC_GATEWAY_URL || "https://api.ondc.org/gateway/v1";
  private ONDC_SUBSCRIBER_ID = process.env.ONDC_SUBSCRIBER_ID;
  private ONDC_UKID = process.env.ONDC_UKID;

  private async fetchWithTimeout(promise: Promise<any>): Promise<any> {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), this.timeout)
    );
    return Promise.race([promise, timeoutPromise]);
  }

  private calculateSurge(provider: string, mode: TransportMode, distanceKm: number, durationMin: number | undefined, weather: WeatherContext): number {
    return FareEngine.calculateProviderPrice(provider, mode, {
      distanceKm,
      durationMin,
      isRaining: weather.isRaining
    });
  }

  private async triggerRealONDC(origin: string, dest: string, transactionId: string) {
    const becknPayload = {
      context: {
        domain: "nic2004:60221", // Mobility
        country: "IND",
        city: "std:080", // Bangalore
        action: "search",
        core_version: "1.1.0",
        bap_id: this.ONDC_SUBSCRIBER_ID,
        bap_uri: `${process.env.APP_URL}/api/ondc/callback`,
        transaction_id: transactionId,
        message_id: uuidv4(),
        timestamp: new Date().toISOString()
      },
      message: {
        intent: {
          fulfillment: {
            start: { location: { gps: "12.9716,77.5946" } }, // Should be parsed from origin
            end: { location: { gps: "12.9279,77.6271" } }    // Should be parsed from dest
          }
        }
      }
    };

    // In production, you would sign this payload here
    // const signature = sign(becknPayload, privateKey);
    
    try {
      const response = await fetch(`${this.ONDC_GATEWAY_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Signature keyId="${this.ONDC_SUBSCRIBER_ID}|${this.ONDC_UKID}|ed25519",algorithm="ed25519",created="${Math.floor(Date.now()/1000)}",expires="${Math.floor(Date.now()/1000) + 3600}",headers="(created) (expires) digest",signature="TODO_REAL_SIGNATURE"`
        },
        body: JSON.stringify(becknPayload)
      });

      if (!response.ok) {
        throw new Error(`Gateway responded with ${response.status}`);
      }
      
      console.log(`[ONDC] Search broadcasted successfully for ${transactionId}`);
    } catch (error) {
      console.error(`[ONDC] Gateway Error:`, error);
    }
  }

  async fetchAllBids(origin: string, dest: string, distanceKm: number, durationMin: number | undefined, weather: WeatherContext, context?: { batteryLevel: number }): Promise<RideBid[]> {
    console.log(`[ProviderService] Using Connectors (NY architecture) for ${origin} -> ${dest}`);
    
    const tasks = this.connectors.map(connector => 
      connector.fetchBids(origin, dest, distanceKm, durationMin || 0, weather, context)
        .catch(e => {
          console.error(`Connector Error (${connector.name}):`, e.message);
          return [];
        })
    );

    const results = await Promise.all(tasks);
    const validBids = results.flat();
    
    // Add transaction ID and ONDC flag for applicable bids
    const transactionId = uuidv4();
    validBids.forEach(bid => {
      if (bid.provider === "Namma Yatri" || bid.isONDC) {
        bid.transactionId = transactionId;
        bid.isONDC = true;
      }
    });

    console.log(`[ProviderService] Received ${validBids.length} valid bids from connectors`);
    return validBids;
  }
}
