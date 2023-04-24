class HotelDetailDto {
    constructor(
        address,
        title,
        price,
        starCount,
        reviewScore,
        reviewCount,
        imageUrl,
        userCheckIn,
        userCheckOut,
        adultCount,
        childrenCount,
        roomCount,
        searchId,
        hotelId,
        url,
        lat,
        long,
        images,
        summary,
        closeLocations,
        popularFacilities,
        facilities,
        policies
    ) {
        this.title = title;
        this.address = address;
        this.price = price;
        this.starCount = starCount;
        this.reviewScore = reviewScore;
        this.reviewCount = reviewCount;
        this.imageUrl = imageUrl;
        this.userCheckIn = userCheckIn;
        this.userCheckOut = userCheckOut;
        this.adultCount = adultCount;
        this.childrenCount = childrenCount;
        this.roomCount = roomCount;
        this.searchId = searchId;
        this.hotelId = hotelId;
        this.url = url;
        this.lat = lat;
        this.long = long;
        this.images = images;
        this.summary = summary;
        this.closeLocations = closeLocations;
        this.popularFacilities = popularFacilities;
        this.facilities = facilities;
        this.policies = policies;
    }
}

module.exports = HotelDetailDto;