db.createUser(
{
	user:"admin",
	pwd:"admin",
	roles:[
	{
		role:"readWrite",
		db:"tworist"
	}
	]
})
print("User Created!");
db.auth('admin', 'admin')
print("Login Successfull");
db = db.getSiblingDB('tworist')
//db.createCollection('workOrders')
//print("workOrders collection created");
