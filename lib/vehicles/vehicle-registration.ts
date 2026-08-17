import { getFipeQuote } from "../fipe";

export const VEHICLE_SOURCE_TYPES = ["dealer_inventory","consignment","trade_in","autoponte_inventory","partner_inventory","new_vehicle"] as const;
export const VEHICLE_STATUSES = ["available","evaluation","reserved","sold","unavailable"] as const;
export const INVENTORY_SCOPES = ["autoponte","partner"] as const;

export type VehicleRegistrationInput = {
  inventoryScope: typeof INVENTORY_SCOPES[number]; partnerId: string;
  sourceType: typeof VEHICLE_SOURCE_TYPES[number]; status: typeof VEHICLE_STATUSES[number];
  plate:string; chassis:string; stockCode:string; brandCode:string; modelCode:string; yearCode:string;
  mileage:number; color:string; transmission:string; bodyType:string; doors:number; engine:string; power:string;
  renavam:string; registrationState:string; documentStatus:string; vehicleCondition:string; inspectionStatus:string;
  acquisitionDate:string; listingDate:string; optionalItems:string; city:string; ownerName:string;
  askingPrice:number; acquisitionCost:number; additionalCosts:number; notes:string;
};
type ParseVehicleRegistrationOptions = {
  allowedLegacyFipe?: {
    brandCode: string;
    modelCode: string;
    yearCode: string;
  };
};
const cleanText=(value:unknown,max=180)=>typeof value==="string"?value.trim().slice(0,max):"";
const cleanMoney=(value:unknown)=>{const numeric=Number(value??0);return Number.isFinite(numeric)&&numeric>=0?Math.round(numeric):0};
const cleanMileage=(value:unknown)=>{const numeric=Number(value??0);if(!Number.isFinite(numeric)||numeric<0||numeric>2_000_000)throw new Error("Quilometragem inválida.");return Math.round(numeric)};
const cleanDate=(value:unknown)=>{const raw=cleanText(value,10);if(!raw)return "";if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime()))throw new Error("Data inválida.");return raw};
export function normalizePlate(value:unknown){const plate=cleanText(value,8).toUpperCase().replace(/[^A-Z0-9]/g,"");if(plate&&!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate))throw new Error("Placa inválida. Use o padrão ABC1D23 ou ABC1234.");return plate}
export function parseVehicleRegistrationInput(
  raw: Record<string, unknown>,
  options?: ParseVehicleRegistrationOptions
): VehicleRegistrationInput {
  const inventoryScope=cleanText(raw.inventoryScope) as VehicleRegistrationInput["inventoryScope"];
  const partnerId=cleanText(raw.partnerId,80);
  const sourceType=cleanText(raw.sourceType) as VehicleRegistrationInput["sourceType"];
  const status=cleanText(raw.status) as VehicleRegistrationInput["status"];
  if(!INVENTORY_SCOPES.includes(inventoryScope))throw new Error("Tipo de estoque inválido.");
  if(inventoryScope==="partner"&&!partnerId)throw new Error("Selecione o parceiro responsável pelo veículo.");
  if(!VEHICLE_SOURCE_TYPES.includes(sourceType))throw new Error("Origem do veículo inválida.");
  if(!VEHICLE_STATUSES.includes(status))throw new Error("Status do veículo inválido.");
  const brandCode=cleanText(raw.brandCode,12),modelCode=cleanText(raw.modelCode,12),yearCode=cleanText(raw.yearCode,20);
  const hasStrictFipeCodes = /^\d+$/.test(brandCode) && /^\d+$/.test(modelCode) && /^\d{4,5}-\d+$/.test(yearCode);
  const hasAllowedLegacyFipe =
    options?.allowedLegacyFipe
      ? brandCode === options.allowedLegacyFipe.brandCode &&
        modelCode === options.allowedLegacyFipe.modelCode &&
        yearCode === options.allowedLegacyFipe.yearCode
      : false;
  if(!hasStrictFipeCodes && !hasAllowedLegacyFipe)throw new Error("Selecione marca, modelo e ano pela FIPE.");
  return {inventoryScope,partnerId:inventoryScope==="partner"?partnerId:"",sourceType,status,plate:normalizePlate(raw.plate),chassis:cleanText(raw.chassis,24).toUpperCase().replace(/[^A-Z0-9]/g,""),stockCode:cleanText(raw.stockCode,40).toUpperCase(),brandCode,modelCode,yearCode,mileage:cleanMileage(raw.mileage),color:cleanText(raw.color,60),transmission:cleanText(raw.transmission,40),bodyType:cleanText(raw.bodyType,60),doors:Math.max(0,Math.min(8,Math.round(Number(raw.doors??0)||0))),engine:cleanText(raw.engine,80),power:cleanText(raw.power,40),renavam:cleanText(raw.renavam,20).replace(/\D/g,""),registrationState:cleanText(raw.registrationState,2).toUpperCase(),documentStatus:cleanText(raw.documentStatus,40)||"regular",vehicleCondition:cleanText(raw.vehicleCondition,40)||"good",inspectionStatus:cleanText(raw.inspectionStatus,40)||"pending",acquisitionDate:cleanDate(raw.acquisitionDate),listingDate:cleanDate(raw.listingDate),optionalItems:cleanText(raw.optionalItems,4000),city:cleanText(raw.city,100),ownerName:cleanText(raw.ownerName,160),askingPrice:cleanMoney(raw.askingPrice),acquisitionCost:cleanMoney(raw.acquisitionCost),additionalCosts:cleanMoney(raw.additionalCosts),notes:cleanText(raw.notes,2000)};
}
export async function resolveVehicleRegistration(input:VehicleRegistrationInput){const quote=await getFipeQuote(input.brandCode,input.modelCode,input.yearCode);return {...input,quote}}
