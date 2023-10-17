import enums
from application.shopping.ShoppingScreen import Page
from weighted.weighted import WeightedArray

main_exception_rate = WeightedArray([(True, 6), (False, 10000)])
category_exception_rate = WeightedArray([(True, 1), (False, 10000)])
search_exception_rate = WeightedArray([(True, 1), (False, 10000)])
detail_exception_rate = WeightedArray([(True, 8), (False, 10000)])
cart_exception_rate = WeightedArray([(True, 4), (False, 10000)])
checkout_exception_rate = WeightedArray([(True, 1), (False, 10000)])
result_exception_rate = WeightedArray([(True, 1), (False, 10000)])
profile_exception_rate = WeightedArray([(True, 1), (False, 10000)])
login_exception_rate = WeightedArray([(True, 2), (False, 10000)])
signup_exception_rate = WeightedArray([(True, 1), (False, 10000)])


def get_whether_have_exception(page):
    if page == Page.MAIN:
        return main_exception_rate.get_random_item()
    if page == Page.CATEGORY:
        return category_exception_rate.get_random_item()
    if page == Page.SEARCH:
        return search_exception_rate.get_random_item()
    if page == Page.DETAIL:
        return detail_exception_rate.get_random_item()
    if page == Page.CART:
        return cart_exception_rate.get_random_item()
    if page == Page.CHECKOUT:
        return checkout_exception_rate.get_random_item()
    if page == Page.RESULT:
        return result_exception_rate.get_random_item()
    if page == Page.PROFILE:
        return profile_exception_rate.get_random_item()
    if page == Page.LOGIN:
        return login_exception_rate.get_random_item()
    if page == Page.SIGN_UP:
        return signup_exception_rate.get_random_item()
    return False


def get_exception_by_page(page, platform):
    have_exception = get_whether_have_exception(page)
    if have_exception:
        return get_exception_info(page, platform)
    return None


def get_exception_info(page, platform):
    if page == Page.MAIN:
        if platform == enums.Platform.Android:
            return ("java.lang.NullPointerException",
                    "Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'String "
                    "android.content.Context.getPackageName()' on a null object reference "
                    "\n\tat com.shopping.app.main.MainActivity.onCreate(MainActivity.java:20)")
        elif platform == enums.Platform.iOS:
            return ("NSInvalidArgumentException",
                    "Terminating app due to uncaught exception 'NSInvalidArgumentException',"
                    "\n\treason: '*** -[__NSArray objectAtIndex:]: index 10 beyond bounds [0 .. 9]'")
    if page == Page.CATEGORY:
        if platform == enums.Platform.Android:
            return ("android.os.NetworkOnMainThreadException",
                    "Caused by: android.os.NetworkOnMainThreadException"
                    "\n\tat android.os.StrictMode$AndroidBlockGuardPolicy.onNetwork(StrictMode.java:1513)"
                    "\n\tat java.net.Inet6AddressImpl.lookupHostByName(Inet6AddressImpl.java:117)"
                    "\n\tat com.shopping.app.category.CategoryActivity.onResume(CategoryActivity.java:32)")
        elif platform == enums.Platform.iOS:
            return ("EXC_BAD_ACCESS",
                    "Thread 0 Crashed: EXC_BAD_ACCESS (SIGSEGV) at 0x00000000 (nil) "
                    "in com.shopping.app.category.CategoryViewController.tableView(_:cellForRowAt:)")

    if page == Page.SEARCH:
        if platform == enums.Platform.Android:
            return ("java.lang.UnsupportedOperationException",
                    "Caused by: java.lang.UnsupportedOperationException: Operation not supported"
                    "\n\tat java.util.Collections$UnmodifiableMap.put(Collections.java:1457)"
                    "\n\tat com.shopping.app.search.SearchActivity.onFilterSelected(SearchActivity.java:92)")
        elif platform == enums.Platform.iOS:
            return ("NSInvalidArgumentException",
                    "Terminating app due to uncaught exception 'NSInvalidArgumentException', "
                    "\n\treason: '*** -[__NSArrayM objectAtIndex:]: index 10 beyond bounds [0 .. 9]'")

    if page == Page.DETAIL:
        if platform == enums.Platform.Android:
            return ("java.lang.SecurityException",
                    "Caused by: java.lang.SecurityException: Missing required permission: android.permission.CAMERA"
                    "\n\tat com.shopping.app.detail.DetailActivity.openCamera(DetailActivity.java:63)")
        elif platform == enums.Platform.iOS:
            return ("NSInvalidArgumentException",
                    "Terminating app due to uncaught exception 'NSInvalidArgumentException', "
                    "\n\treason: '*** -[__NSDictionaryM setObject:forKey:]: object cannot be nil (key: username)'")
    if page == Page.CART:
        if platform == enums.Platform.Android:
            return ("java.lang.IndexOutOfBoundsException",
                    "Caused by: java.lang.IndexOutOfBoundsException: Index: 10, Size: 9 "
                    "\n\tat java.util.ArrayList.get(ArrayList.java:411)"
                    "\n\tat com.shopping.app.cart.CartActivity.updateCartItem(CartActivity.java:55)")
        elif platform == enums.Platform.iOS:
            return ("EXC_CRASH (SIGABRT)",
                    "Thread 0 Crashed: EXC_CRASH (SIGABRT) in "
                    "com.shopping.app.cart.CartViewController.updateCartItem(_:)")
    if page == Page.CHECKOUT:
        if platform == enums.Platform.Android:
            return ("java.lang.ArithmeticException",
                    "Caused by: java.lang.ArithmeticException: divide by zero"
                    "\n\tat com.shopping.app.checkout.CheckoutActivity.calculateTotal(CheckoutActivity.java:76)")
        elif platform == enums.Platform.iOS:
            return ("NSInternalInconsistencyException",
                    "*** Terminating app due to uncaught exception 'NSInternalInconsistencyException', "
                    "\n\treason: 'Invalid update: invalid number of rows in section 0.'")
    if page == Page.RESULT:
        if platform == enums.Platform.Android:
            return ("java.lang.OutOfMemoryError",
                    "Caused by: java.lang.OutOfMemoryError: Failed to allocate a 5120012 byte allocation with 4194304 "
                    "free bytes and 4MB until OOM"
                    "\n\tat com.shopping.app.ImageLoader.loadBitmap(ImageLoader.java:78)"
                    "\n\tat com.shopping.app.result.ResultActivity.onStop(ResultActivity.java:36)")
        elif platform == enums.Platform.iOS:
            return ("EXC_CRASH (SIGABRT)",
                    "Thread 0 Crashed: EXC_CRASH (SIGABRT) "
                    "com.shopping.app.result.ResultViewController.tableView(_:didSelectRowAt:)")
    if page == Page.PROFILE:
        if platform == enums.Platform.Android:
            return ("java.lang.ClassCastException",
                    "Caused by: java.lang.ClassCastException: android.view.ViewGroup$LayoutParams cannot be cast to "
                    "android.widget.LinearLayout$LayoutParams"
                    "\n\tat com.shopping.app.profile.ProfileActivity.onCreated(ProfileActivity.java:40)")
        elif platform == enums.Platform.iOS:
            return ("NSUnknownKeyException",
                    "Terminating app due to uncaught exception 'NSUnknownKeyException', "
                    "\n\treason: '[<UIViewController 0x7fa3e54102a0> setValue:forUndefinedKey:]: "
                    "this class is not key value coding-compliant for the key loginButton.'")

    if page == Page.LOGIN:
        if platform == enums.Platform.Android:
            return ("android.database.sqlite.SQLiteException",
                    "Caused by: android.database.sqlite.SQLiteException: no such table: products (code 1)"
                    "\n\tat android.database.sqlite.SQLiteConnection.nativeExecuteForCursorWindow(Native Method)"
                    "\n\tat android.database.sqlite.SQLiteConnection.executeForCursorWindow(SQLiteConnection.java:860)"
                    "\n\tat android.database.sqlite.SQLiteSession.executeForCursorWindow(SQLiteSession.java:836)"
                    "\n\tat at com.shopping.app.login.LoginActivity.onLoginSuccess(LoginActivity.java:50)")
        elif platform == enums.Platform.iOS:
            return ("NSInvalidArgumentException",
                    "Terminating app due to uncaught exception 'NSInvalidArgumentException', "
                    "\n\treason: '*** -[NSNull length]: unrecognized selector sent to instance 0x7fa3e54102a0'")

    if page == Page.SIGN_UP:
        if platform == enums.Platform.Android:
            return ("java.lang.IllegalArgumentException",
                    "Caused by: java.lang.IllegalArgumentException: Invalid email address"
                    "\n\tat com.shopping.app.signup.SignupActivity.validateEmail(SignupActivity.java:45)")
        elif platform == enums.Platform.iOS:
            return ("NSInvalidArgumentException",
                    "Terminating app due to uncaught exception 'NSInvalidArgumentException', "
                    "\n\treason: '*** -[NSNull length]: unrecognized selector sent to instance 0x7fa3e54102a0'")
