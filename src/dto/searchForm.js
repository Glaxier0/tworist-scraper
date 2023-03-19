class SearchForm {
    constructor(search, checkInYear, checkInMonth, checkInDay, checkOutYear,
                checkOutMonth, checkOutDay, adultCount, childCount, roomCount) {
        this.search = search;
        this.checkInYear = checkInYear;
        this.checkInMonth = checkInMonth;
        this.checkInDay = checkInDay;
        this.checkOutYear = checkOutYear;
        this.checkOutMonth = checkOutMonth;
        this.checkOutDay = checkOutDay;
        this.adultCount = adultCount;
        this.childCount = childCount;
        this.roomCount = roomCount;
    }
}

module.exports = SearchForm