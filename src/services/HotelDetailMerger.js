const HotelDetailDto = require("../dto/hotelDetailDto");

async function hotelDetailMerger(hotel, hotelDetails) {
    return new HotelDetailDto(
        hotel.title, hotel.address, hotel.price, hotel.starCount, hotel.reviewScore, hotel.reviewCount,
        hotel.imageUrl, hotel.searchId, hotelDetails.hotelId, hotelDetails.url, hotelDetails.lat,
        hotelDetails.long, hotelDetails.images, hotelDetails.summary, hotelDetails.closeLocations,
        hotelDetails.popularFacilities, hotelDetails.facilities, hotelDetails.policies
    );
}

module.exports = hotelDetailMerger;
